import os
from langchain_text_splitters import RecursiveCharacterTextSplitter

_CHUNK_SIZE = int(os.getenv("TEXT_CHUNK_SIZE", "1000"))
_CHUNK_OVERLAP = int(os.getenv("TEXT_CHUNK_OVERLAP", "200"))

_code_separators = [
    "\nclass ",
    "\nfunction ",
    "\nconst ",
    "\nlet ",
    "\nvar ",
    "\ndef ",
    "\n    ",
    "\n\t",
    "\n",
    " ",
    "",
]

_splitter = RecursiveCharacterTextSplitter(
    chunk_size=_CHUNK_SIZE,
    chunk_overlap=_CHUNK_OVERLAP,
    separators=_code_separators,
    length_function=len,
)


def split_file_content(file_name: str, content: str) -> list[dict]:
    chunks = _splitter.split_text(content)
    return [
        {
            "content": chunk,
            "metadata": {
                "source_file": file_name,
                "chunk_index": i,
                "total_chunks": len(chunks),
            },
        }
        for i, chunk in enumerate(chunks)
    ]


def split_files(
    files: list[dict],
) -> list[dict]:
    all_chunks = []
    for file in files:
        chunks = split_file_content(file["name"], file["content"])
        all_chunks.extend(chunks)
    return all_chunks
