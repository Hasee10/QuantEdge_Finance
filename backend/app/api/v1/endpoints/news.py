from __future__ import annotations

import hashlib
import json
import os
from datetime import date, datetime, timedelta, timezone
from typing import Any, Dict, Iterable, List
from urllib.parse import quote

import httpx
from fastapi import APIRouter, Body, HTTPException, Query
from groq import Groq

from app.services.supabase_service import supabase_headers, supabase_rest_url

router = APIRouter(prefix="/news", tags=["news"])

NEWS_API_KEY = os.getenv("NEWS_API_KEY")
GNEWS_API_KEY = os.getenv("GNEWS_API_KEY")
YOUTUBE_API_KEY = os.getenv("YOUTUBE_API_KEY")

CATEGORY_QUERIES: Dict[str, str] = {
    "markets": "stock market OR financial markets OR S&P 500 OR Fed OR interest rates",
    "mergers": "merger acquisition M&A deal buyout takeover",
    "earnings": "earnings report quarterly results EPS revenue guidance",
    "geopolitics": "geopolitics trade war sanctions tariffs emerging markets",
    "fintech": "fintech cryptocurrency blockchain DeFi digital assets",
    "ipo": "IPO initial public offering listing SPAC",
    "privateequity": "private equity PE fund LBO leveraged buyout",
    "macro": "GDP inflation CPI unemployment Federal Reserve ECB",
}

DEFAULT_CHANNELS = [
    "UCrM7B7SL_g1edFOnmj-SDKg",
    "UCvJJ_dzjViJCoLf5uKUTwoA",
    "UCddiUEpeqJcYeBxX1IVBKvQ",
]

DAILY_LIMITS = {"newsapi": 90, "gnews": 90, "youtube": 95}


def _utc_now() -> datetime:
    return datetime.now(timezone.utc)


def _iso_now() -> str:
    return _utc_now().isoformat()


def _parse_iso(value: str | None) -> datetime | None:
    if not value:
        return None
    try:
        return datetime.fromisoformat(value.replace("Z", "+00:00"))
    except ValueError:
        return None


async def _supabase_get(path: str):
    try:
        async with httpx.AsyncClient(timeout=15) as client:
            r = await client.get(
                f"{supabase_rest_url()}/{path}",
                headers=supabase_headers(),
            )
            r.raise_for_status()
            data = r.json()
            return data if isinstance(data, list) else [data]
    except Exception as e:
        print("SUPABASE GET ERROR:", e)
        return []


async def _supabase_post(path: str, payload: Any):
    try:
        async with httpx.AsyncClient(timeout=15) as client:
            await client.post(
                f"{supabase_rest_url()}/{path}",
                headers=supabase_headers(),
                json=payload,
            )
    except Exception as e:
        print("SUPABASE POST ERROR:", e)


async def check_news_cache(cache_key: str, ttl_minutes: int):
    try:
        rows = await _supabase_get(
            f"news_cache?select=data,fetched_at&cache_key=eq.{quote(cache_key)}"
        )

        if not rows:
            return None

        row = rows[0]
        fetched_at = _parse_iso(row.get("fetched_at"))

        if fetched_at and _utc_now() - fetched_at < timedelta(minutes=ttl_minutes):
            return row.get("data")

    except Exception as e:
        print("CACHE CHECK ERROR:", e)

    return None


async def set_news_cache(cache_key: str, data: dict):
    try:
        await _supabase_post(
            "news_cache",
            {
                "cache_key": cache_key,
                "data": data,
                "fetched_at": _iso_now(),
            },
        )
    except Exception as e:
        print("CACHE WRITE ERROR:", e)


def detect_category(text: str) -> str:
    t = text.lower()

    if "merger" in t or "acquisition" in t:
        return "mergers"
    if "earnings" in t:
        return "earnings"
    if "ipo" in t:
        return "ipo"
    if "crypto" in t:
        return "fintech"
    if "inflation" in t or "gdp" in t:
        return "macro"

    return "markets"


def _article_id(url: str) -> str:
    return hashlib.md5(url.encode()).hexdigest()


async def _fetch_newsapi_articles(query: str, page: int, page_size: int):

    if not NEWS_API_KEY:
        return []

    try:
        async with httpx.AsyncClient(timeout=10) as client:

            r = await client.get(
                "https://newsapi.org/v2/everything",
                params={
                    "q": query,
                    "language": "en",
                    "sortBy": "publishedAt",
                    "pageSize": page_size,
                    "page": page,
                    "apiKey": NEWS_API_KEY,
                },
            )

            if r.status_code != 200:
                return []

            payload = r.json()

            articles = []

            for a in payload.get("articles", []):

                url = a.get("url")
                if not url:
                    continue

                text = f"{a.get('title','')} {a.get('description','')}"

                articles.append(
                    {
                        "id": _article_id(url),
                        "title": a.get("title"),
                        "summary": a.get("description") or "",
                        "url": url,
                        "source": a.get("source", {}).get("name") or "Unknown",
                        "published_at": a.get("publishedAt"),
                        "thumbnail_url": a.get("urlToImage"),
                        "category": detect_category(text),
                    }
                )

            return articles

    except Exception as e:
        print("NEWSAPI ERROR:", e)
        return []


async def _fetch_gnews_articles(query: str, page_size: int):

    if not GNEWS_API_KEY:
        return []

    try:
        async with httpx.AsyncClient(timeout=10) as client:

            r = await client.get(
                "https://gnews.io/api/v4/search",
                params={
                    "q": query,
                    "lang": "en",
                    "max": page_size,
                    "apikey": GNEWS_API_KEY,
                },
            )

            if r.status_code != 200:
                return []

            payload = r.json()

            articles = []

            for a in payload.get("articles", []):

                url = a.get("url")
                if not url:
                    continue

                text = f"{a.get('title','')} {a.get('description','')}"

                articles.append(
                    {
                        "id": _article_id(url),
                        "title": a.get("title"),
                        "summary": a.get("description") or "",
                        "url": url,
                        "source": a.get("source", {}).get("name") or "Unknown",
                        "published_at": a.get("publishedAt"),
                        "thumbnail_url": a.get("image"),
                        "category": detect_category(text),
                    }
                )

            return articles

    except Exception as e:
        print("GNEWS ERROR:", e)
        return []


def _dedupe_articles(articles: Iterable[Dict[str, Any]]):
    seen = {}
    for a in articles:
        if a.get("url"):
            seen[a["url"]] = a
    return list(seen.values())


@router.get("/feed")
async def get_news_feed(
    categories: str = Query(default="markets,mergers,earnings"),
    tickers: str = Query(default=""),
    search: str = Query(default=""),
    page: int = Query(default=1),
    page_size: int = Query(default=20),
):

    try:

        query = search or categories

        articles = await _fetch_newsapi_articles(query, page, page_size)

        gnews_articles = await _fetch_gnews_articles(query, page_size)

        urls = {a["url"] for a in articles}

        articles.extend(a for a in gnews_articles if a["url"] not in urls)

        deduped = _dedupe_articles(articles)

        deduped.sort(key=lambda a: a.get("published_at") or "", reverse=True)

        return {
            "articles": deduped[:page_size],
            "total": len(deduped),
            "page": page,
            "cached_at": _iso_now(),
        }

    except Exception as e:
        print("NEWS FEED ERROR:", e)

        return {
            "articles": [],
            "total": 0,
            "page": page,
            "cached_at": _iso_now(),
        }


@router.get("/videos")
async def get_finance_videos(query: str = Query(default="financial markets"), max_results: int = 12):

    try:

        if not YOUTUBE_API_KEY:
            return {"videos": []}

        async with httpx.AsyncClient(timeout=10) as client:

            r = await client.get(
                "https://www.googleapis.com/youtube/v3/search",
                params={
                    "part": "snippet",
                    "q": query,
                    "type": "video",
                    "maxResults": max_results,
                    "key": YOUTUBE_API_KEY,
                },
            )

            if r.status_code != 200:
                return {"videos": []}

            payload = r.json()

            videos = []

            for item in payload.get("items", []):

                snippet = item.get("snippet", {})

                videos.append(
                    {
                        "title": snippet.get("title"),
                        "thumbnail": snippet.get("thumbnails", {}).get("medium", {}).get("url"),
                        "published_at": snippet.get("publishedAt"),
                    }
                )

            return {"videos": videos}

    except Exception as e:
        print("VIDEO ERROR:", e)
        return {"videos": []}


@router.post("/sentiment")
async def batch_sentiment(headlines: List[str] = Body(default=[])):

    try:

        if not headlines:
            return {"sentiments": []}

        groq_key = os.getenv("GROQ_API_KEY")

        if not groq_key:
            return {"sentiments": ["neutral"] * len(headlines)}

        client = Groq(api_key=groq_key)

        numbered = "\n".join(f"{i+1}. {h}" for i, h in enumerate(headlines))

        prompt = f"Classify sentiment bullish bearish neutral\n{numbered}"

        response = client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=[{"role": "user", "content": prompt}],
        )

        text = response.choices[0].message.content

        if "[" in text:
            sentiments = json.loads(text[text.index("[") : text.rindex("]") + 1])
            return {"sentiments": sentiments}

    except Exception as e:
        print("SENTIMENT ERROR:", e)

    return {"sentiments": ["neutral"] * len(headlines)}


@router.get("/preferences")
async def get_preferences(user_id: str = Query(...)):

    try:

        rows = await _supabase_get(f"news_preferences?select=*&user_id=eq.{quote(user_id)}")

        if rows:
            return rows[0]

        return {
            "user_id": user_id,
            "categories": ["markets"],
            "followed_tickers": [],
            "followed_channels": [],
        }

    except Exception as e:

        print("PREFERENCES ERROR:", e)

        return {
            "user_id": user_id,
            "categories": [],
            "followed_tickers": [],
            "followed_channels": [],
        }