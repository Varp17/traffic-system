import tempfile
import unittest
from pathlib import Path

from ai_harness.research.arxiv_client import ArxivClient
from ai_harness.research.crossref_client import CrossRefClient
from ai_harness.research.synthesizer import ResearchSynthesizer
from ai_harness.storage.checkpoint_manager import CheckpointManager


SAMPLE_ARXIV_XML = """<?xml version="1.0" encoding="UTF-8"?>
<feed xmlns="http://www.w3.org/2005/Atom" xmlns:arxiv="http://arxiv.org/schemas/atom">
  <entry>
    <id>http://arxiv.org/abs/2401.08921v1</id>
    <published>2024-01-16T12:00:00Z</published>
    <title>Autonomous Adaptive Traffic Signal Control via Deep Reinforcement Learning</title>
    <summary>This paper proposes an edge-optimized deep RL model for 4-way intersection preemption.</summary>
    <author><name>Dr. Jane Doe</name></author>
    <author><name>Prof. John Smith</name></author>
    <link href="http://arxiv.org/pdf/2401.08921v1" rel="related" type="application/pdf" title="pdf"/>
  </entry>
</feed>
"""

SAMPLE_CROSSREF_ITEMS = [
    {
        "DOI": "10.1109/TITS.2024.123456",
        "title": ["Real-Time Urban Signal Timing using Graph Neural Networks"],
        "author": [{"given": "Alice", "family": "Wang"}],
        "publisher": "IEEE",
        "abstract": "We evaluate traffic queue latency under mixed traffic flow conditions.",
        "is-referenced-by-count": 42,
    }
]


class TestResearchScraper(unittest.TestCase):
    def test_parse_arxiv_feed(self):
        client = ArxivClient()
        items = client._parse_atom_feed(SAMPLE_ARXIV_XML)

        self.assertEqual(len(items), 1)
        self.assertEqual(items[0].id, "arxiv_2401.08921v1")
        self.assertIn("Deep Reinforcement Learning", items[0].title)
        self.assertEqual(len(items[0].authors), 2)
        self.assertIn("Jane Doe", items[0].authors[0])
        self.assertEqual(items[0].source, "arXiv")

    def test_parse_crossref_items(self):
        client = CrossRefClient()
        items = client._parse_items(SAMPLE_CROSSREF_ITEMS)

        self.assertEqual(len(items), 1)
        self.assertEqual(items[0].doi, "10.1109/TITS.2024.123456")
        self.assertIn("Graph Neural Networks", items[0].title)
        self.assertIn("IEEE", items[0].source)
        self.assertEqual(items[0].citations_count, 42)

    def test_synthesizer_generates_markdown(self):
        with tempfile.TemporaryDirectory() as tmp_dir:
            mgr = CheckpointManager(tmp_dir)
            synth = ResearchSynthesizer(mgr)

            arxiv_items = ArxivClient()._parse_atom_feed(SAMPLE_ARXIV_XML)
            doc_path = synth.generate_synthesis_document("Adaptive Traffic Systems", arxiv_items)

            self.assertTrue(doc_path.is_file())
            content = doc_path.read_text(encoding="utf-8")
            self.assertIn("SOTA Research Synthesis", content)
            self.assertIn("Deep Reinforcement Learning", content)


if __name__ == "__main__":
    unittest.main()
