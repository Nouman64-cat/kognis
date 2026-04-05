"""Allocate per-bucket question counts from user-defined name + percentage rows."""

from __future__ import annotations

import math

from app.schemas import TopicMixEntry


def allocate_question_counts(entries: list[TopicMixEntry], total: int) -> dict[str, int]:
    """Map each bucket name to a non-negative integer count summing to `total`."""
    if total < 1 or not entries:
        return {}
    names = [e.name for e in entries]
    pcts = [e.percent for e in entries]
    raw = [p / 100.0 * total for p in pcts]
    floors = [math.floor(x) for x in raw]
    remainder = total - sum(floors)
    order = sorted(range(len(names)), key=lambda i: raw[i] - floors[i], reverse=True)
    for j in range(remainder):
        floors[order[j]] += 1
    return dict(zip(names, floors))
