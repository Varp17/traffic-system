"""Project Inspector & Codebase Introspection Engine.

Recursively analyzes any codebase to discover:
- Architecture, framework, and programming languages
- Dependencies, libraries, models, and endpoints
- Core domain problem statements and existing features
"""

from __future__ import annotations

import os
from pathlib import Path
from typing import Any, Dict, List, Set


class ProjectInspector:
    """Introspects any project directory to understand its stack, structure, and intent."""

    IGNORE_DIRS = {
        ".git",
        ".venv",
        "venv",
        "env",
        "__pycache__",
        "node_modules",
        "dist",
        "build",
        ".idea",
        ".vscode",
        ".ai-harness",
    }

    CODE_EXTENSIONS = {
        ".py": "Python",
        ".js": "JavaScript",
        ".ts": "TypeScript",
        ".tsx": "React TypeScript",
        ".jsx": "React JavaScript",
        ".go": "Go",
        ".rs": "Rust",
        ".java": "Java",
        ".cpp": "C++",
        ".c": "C",
        ".cs": "C#",
        ".html": "HTML",
        ".css": "CSS",
        ".sql": "SQL",
    }

    def __init__(self, project_dir: Path | str):
        self.project_dir = Path(project_dir).resolve()

    def inspect(self) -> Dict[str, Any]:
        """Perform full inspection of the target project directory."""
        languages: Dict[str, int] = {}
        key_files: List[str] = []
        dependencies: Set[str] = set()
        readme_content = ""
        spec_content = ""

        # Walk directory
        for root, dirs, files in os.walk(self.project_dir):
            dirs[:] = [d for d in dirs if d not in self.IGNORE_DIRS]
            rel_root = Path(root).relative_to(self.project_dir)

            for file in files:
                rel_path = rel_root / file if str(rel_root) != "." else Path(file)
                rel_str = str(rel_path).replace("\\", "/")
                ext = rel_path.suffix.lower()

                # Track language
                if ext in self.CODE_EXTENSIONS:
                    lang = self.CODE_EXTENSIONS[ext]
                    languages[lang] = languages.get(lang, 0) + 1

                # Track key config / manifest files
                lower_name = file.lower()
                if lower_name in (
                    "readme.md",
                    "project_specification.md",
                    "requirements.txt",
                    "package.json",
                    "pyproject.toml",
                    "dockerfile",
                    "docker-compose.yml",
                    "go.mod",
                    "cargo.toml",
                ):
                    key_files.append(rel_str)

                # Extract dependencies from requirements.txt
                if lower_name == "requirements.txt":
                    try:
                        with open(Path(root) / file, "r", encoding="utf-8", errors="ignore") as f:
                            for line in f:
                                line = line.strip()
                                if line and not line.startswith("#"):
                                    dep_name = line.split("==")[0].split(">=")[0].split("<=")[0].strip()
                                    if dep_name:
                                        dependencies.add(dep_name)
                    except Exception:
                        pass

                # Read README excerpt
                if lower_name == "readme.md" and not readme_content:
                    try:
                        with open(Path(root) / file, "r", encoding="utf-8", errors="ignore") as f:
                            readme_content = f.read(3000)
                    except Exception:
                        pass

                # Read specification excerpt
                if "specification" in lower_name and not spec_content:
                    try:
                        with open(Path(root) / file, "r", encoding="utf-8", errors="ignore") as f:
                            spec_content = f.read(3000)
                    except Exception:
                        pass

        # Sort languages by frequency
        sorted_languages = sorted(languages.items(), key=lambda x: x[1], reverse=True)

        # Infer project domain
        inferred_domain = self._infer_domain(readme_content, spec_content, list(dependencies))

        return {
            "project_name": self.project_dir.name,
            "project_path": str(self.project_dir),
            "primary_languages": [lang for lang, count in sorted_languages[:4]],
            "language_distribution": dict(sorted_languages),
            "key_files": key_files[:25],
            "dependencies": sorted(list(dependencies))[:30],
            "readme_excerpt": readme_content[:1500],
            "spec_excerpt": spec_content[:1500],
            "inferred_domain": inferred_domain,
        }

    def _infer_domain(self, readme: str, spec: str, deps: List[str]) -> str:
        combined = (readme + " " + spec + " " + " ".join(deps)).lower()
        if any(term in combined for term in ["traffic", "intersection", "pcu", "vehicle", "siren", "atsc", "spat", "v2x"]):
            return "Intelligent Transportation Systems (ITS) & Edge AI Adaptive Traffic Control"
        elif any(term in combined for term in ["e-commerce", "cart", "order", "stripe", "product", "checkout", "store"]):
            return "E-Commerce & Digital Marketplace Platform"
        elif any(term in combined for term in ["medical", "health", "clinical", "patient", "imaging", "dicom"]):
            return "Healthcare AI & Clinical Intelligence"
        elif any(term in combined for term in ["finance", "trading", "crypto", "blockchain", "stock", "portfolio"]):
            return "FinTech, Trading & Algorithmic Finance"
        elif any(term in combined for term in ["llm", "rag", "langchain", "embeddings", "vector", "agent"]):
            return "Generative AI, Multi-Agent & RAG Systems"
        elif any(term in combined for term in ["vision", "yolo", "opencv", "segmentation", "detection", "tracking"]):
            return "Computer Vision & Edge Perception"
        else:
            return "Autonomous High-Performance Software Engineering"
