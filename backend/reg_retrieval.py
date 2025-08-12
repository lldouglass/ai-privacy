import os, glob, json, re
from dataclasses import dataclass
from typing import List, Dict, Any
import numpy as np
from openai import OpenAI

# Simple, file-based retrieval with OpenAI embeddings.
# - Reads all .md files in backend/regs/
# - Chunks them by ~1200 chars w/ overlap
# - Builds embeddings on startup (or loads from cache json)

EMBED_MODEL = "text-embedding-3-small"
CHUNK_SIZE = 1200
CHUNK_OVERLAP = 150
INDEX_PATH = os.path.join(os.path.dirname(__file__), "regs_index.json")
REGS_DIR = os.path.join(os.path.dirname(__file__), "regs")

@dataclass
class RegChunk:
    key: str         # e.g. "S1"
    source: str      # filename
    title: str       # best-effort title (first heading)
    text: str        # chunk text
    embedding: list  # vector

def _read_files() -> List[Dict[str, Any]]:
    files = sorted(glob.glob(os.path.join(REGS_DIR, "*.md")))
    docs = []
    for fp in files:
        with open(fp, "r", encoding="utf-8") as f:
            content = f.read()
        # title = first markdown heading or filename
        m = re.search(r"^#\s*(.+)", content, flags=re.M)
        title = m.group(1).strip() if m else os.path.basename(fp)
        docs.append({"path": fp, "title": title, "content": content})
    return docs

def _chunk(text: str, size=CHUNK_SIZE, overlap=CHUNK_OVERLAP) -> List[str]:
    chunks = []
    i = 0
    while i < len(text):
        chunks.append(text[i : i + size])
        i += size - overlap
    return [c.strip() for c in chunks if c.strip()]

def _compute_embeddings(client: OpenAI, texts: List[str]) -> List[List[float]]:
    # batched for fewer API calls (simple form)
    res = client.embeddings.create(model=EMBED_MODEL, input=texts)
    # OpenAI returns 'data' items in order
    return [d.embedding for d in res.data]

def build_or_load_index(client: OpenAI) -> List[RegChunk]:
    if os.path.exists(INDEX_PATH):
        with open(INDEX_PATH, "r", encoding="utf-8") as f:
            raw = json.load(f)
        return [RegChunk(**r) for r in raw]

    docs = _read_files()
    chunks: List[RegChunk] = []
    texts_to_embed = []
    meta = []
    k_counter = 1

    for d in docs:
        pieces = _chunk(d["content"])
        for p in pieces:
            key = f"S{k_counter}"
            chunks.append(
                RegChunk(
                    key=key,
                    source=os.path.basename(d["path"]),
                    title=d["title"],
                    text=p,
                    embedding=[],
                )
            )
            texts_to_embed.append(p)
            meta.append(len(chunks) - 1)
            k_counter += 1

    if texts_to_embed:
        vecs = _compute_embeddings(client, texts_to_embed)
        for idx, v in zip(meta, vecs):
            chunks[idx].embedding = v

    # cache to json
    with open(INDEX_PATH, "w", encoding="utf-8") as f:
        json.dump([c.__dict__ for c in chunks], f)

    return chunks

def _cosine_sim(a: np.ndarray, b: np.ndarray) -> float:
    denom = (np.linalg.norm(a) * np.linalg.norm(b))
    if denom == 0:
        return 0.0
    return float(np.dot(a, b) / denom)

def retrieve(client: OpenAI, index: List[RegChunk], query: str, k: int = 4) -> List[RegChunk]:
    if not index:
        return []
    q_emb = _compute_embeddings(client, [query])[0]
    q = np.array(q_emb, dtype=np.float32)
    scored = []
    for c in index:
        v = np.array(c.embedding, dtype=np.float32)
        scored.append((c, _cosine_sim(q, v)))
    scored.sort(key=lambda x: x[1], reverse=True)
    return [c for c, _ in scored[:k]]
