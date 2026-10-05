"""ArXiv Academic Paper Scraper & API Client.

Fetches scientific research papers, abstracts, authors, and citation metadata from arXiv.
"""

from __future__ import annotations

import logging
import urllib.parse
import xml.etree.ElementTree as ET
from typing import List, Optional
import requests

from ai_harness.core.models import ResearchItem

logger = logging.getLogger("ai_harness.research.arxiv")

ATOM_NS = {"atom": "http://www.w3.org/2005/Atom", "arxiv": "http://arxiv.org/schemas/atom"}


class ArxivClient:
    """Client for querying the arXiv Export API."""

    BASE_URL = "https://export.arxiv.org/api/query"

    def __init__(self, timeout: int = 6):
        self.timeout = timeout

    def search(self, query: str, max_results: int = 8) -> List[ResearchItem]:
        """Search arXiv by query terms and return structured ResearchItem models."""
        import re
        tokens = re.findall(r"[a-zA-Z0-9]+", query)
        clean_query = " ".join(tokens[:5]) or query
        encoded_query = urllib.parse.quote_plus(clean_query)
        url = f"{self.BASE_URL}?search_query=all:{encoded_query}&start=0&max_results={max_results}&sortBy=relevance&sortOrder=descending"

        try:
            resp = requests.get(url, timeout=self.timeout)
            if resp.status_code != 200:
                logger.warning(f"arXiv API returned HTTP {resp.status_code}")
                return []

            return self._parse_atom_feed(resp.text)
        except Exception as e:
            logger.warning(f"Failed to query arXiv API: {e}")
            return []

    def _parse_atom_feed(self, xml_text: str) -> List[ResearchItem]:
        items: List[ResearchItem] = []
        try:
            root = ET.fromstring(xml_text)
            entries = root.findall("atom:entry", ATOM_NS)

            for entry in entries:
                id_elem = entry.find("atom:id", ATOM_NS)
                raw_id = id_elem.text.strip() if id_elem is not None and id_elem.text else ""
                paper_id = raw_id.split("/abs/")[-1].replace("/", "_") or f"arxiv_{len(items)+1}"

                title_elem = entry.find("atom:title", ATOM_NS)
                title = " ".join(title_elem.text.split()) if title_elem is not None and title_elem.text else "Untitled"

                summary_elem = entry.find("atom:summary", ATOM_NS)
                abstract = " ".join(summary_elem.text.split()) if summary_elem is not None and summary_elem.text else ""

                published_elem = entry.find("atom:published", ATOM_NS)
                published = published_elem.text.strip() if published_elem is not None and published_elem.text else ""

                authors = []
                for author in entry.findall("atom:author", ATOM_NS):
                    name_elem = author.find("atom:name", ATOM_NS)
                    if name_elem is not None and name_elem.text:
                        authors.append(name_elem.text.strip())

                # PDF Link
                pdf_url = ""
                for link in entry.findall("atom:link", ATOM_NS):
                    if link.attrib.get("title") == "pdf" or link.attrib.get("type") == "application/pdf":
                        pdf_url = link.attrib.get("href", "")
                        break
                if not pdf_url:
                    pdf_url = f"https://arxiv.org/pdf/{paper_id}.pdf"

                # Extract key takeaways heuristically from abstract
                sentences = [s.strip() for s in abstract.split(".") if len(s.strip()) > 20]
                key_findings = sentences[:3] if sentences else ["Academic methodology detailed in full paper."]

                items.append(
                    ResearchItem(
                        id=f"arxiv_{paper_id}",
                        title=title,
                        authors=authors,
                        abstract=abstract,
                        source="arXiv",
                        url=pdf_url,
                        published_date=published,
                        extracted_key_findings=key_findings,
                    )
                )
        except Exception as e:
            logger.error(f"Error parsing arXiv XML feed: {e}")

        return items
