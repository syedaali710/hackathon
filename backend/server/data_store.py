"""
Data store for the local CareBridge UAE server.

Loads the synthetic patient and provider datasets from the repo's `backend/data`
directory (the same JSON that the deploy scripts push into DynamoDB) plus a
bilingual provider seed used to render the dashboard's provider cards.

No AWS is required to run locally: this module is the stand-in for DynamoDB.
"""
import json
import os
from functools import lru_cache
from typing import Any, Dict, List

_HERE = os.path.dirname(os.path.abspath(__file__))
_DATA_DIR = os.path.normpath(os.path.join(_HERE, "..", "data"))
_UI_PROVIDERS = os.path.join(_HERE, "data", "providers_ui.json")


def _read_json(path: str) -> Dict[str, Any]:
    with open(path, "r", encoding="utf-8") as fh:
        return json.load(fh)


@lru_cache(maxsize=1)
def patients() -> List[Dict[str, Any]]:
    """All synthetic patient records, keyed loosely by patient_id."""
    return _read_json(os.path.join(_DATA_DIR, "patients.json")).get("patients", [])


@lru_cache(maxsize=1)
def base_providers() -> List[Dict[str, Any]]:
    """Provider records from the shared dataset (DynamoDB seed)."""
    return _read_json(os.path.join(_DATA_DIR, "providers.json")).get("providers", [])


@lru_cache(maxsize=1)
def ui_providers() -> List[Dict[str, Any]]:
    """Bilingual, display-ready neurology providers for the dashboard cards."""
    return _read_json(_UI_PROVIDERS).get("providers", [])


def get_patient(patient_id: str) -> Dict[str, Any] | None:
    for p in patients():
        if p.get("patient_id") == patient_id:
            return p
    return None
