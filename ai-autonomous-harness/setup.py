from setuptools import setup, find_packages

setup(
    name="ai-autonomous-harness",
    version="1.0.0",
    packages=find_packages(),
    include_package_data=True,
    install_requires=[
        "requests>=2.28.0",
        "rich>=13.0.0",
        "pydantic>=2.0.0",
        "python-dotenv>=1.0.0",
    ],
    entry_points={
        "console_scripts": [
            "ai-harness=ai_harness.cli:main",
        ],
    },
)
