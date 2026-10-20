import io
import csv
from pathlib import Path
from typing import Tuple, List, Dict, Any
import openpyxl
import pandas as pd

def parse_file_to_records(file_bytes: bytes, filename: str) -> Tuple[List[Dict[str, Any]], List[Dict[str, Any]]]:
    """
    Processa arquivos CSV ou XLSX retornando (records, columns_metadata).
    Preserva rigorosamente identificadores como strings e zeros à esquerda.
    """
    ext = Path(filename).suffix.lower()

    if ext in ['.xlsx', '.xls']:
        # Leitura de Excel via openpyxl
        wb = openpyxl.load_workbook(io.BytesIO(file_bytes), data_only=True)
        sheet_name = wb.sheetnames[0]
        sheet = wb[sheet_name]

        data = list(sheet.iter_rows(values_only=True))
        if not data or len(data) < 2:
            raise ValueError("O arquivo Excel está vazio ou não possui linhas de dados.")

        headers = [str(col).strip() if col is not None else f"col_{i}" for i, col in enumerate(data[0])]
        raw_rows = data[1:]

        records = []
        for row in raw_rows:
            # Pula linhas completamente vazias
            if all(v is None or str(v).strip() == "" for v in row):
                continue
            record = {}
            for i, header in enumerate(headers):
                val = row[i] if i < len(row) else None
                # Se for número inteiro puro, converte preservando consistência
                if isinstance(val, float) and val.is_integer():
                    val = int(val)
                record[header] = val
            records.append(record)

    elif ext in ['.csv', '.tsv', '.txt']:
        # Tenta decodificar UTF-8 com BOM, fallback para latin-1
        try:
            text = file_bytes.decode('utf-8-sig')
        except UnicodeDecodeError:
            text = file_bytes.decode('latin-1')

        # Detecta delimitador (, ou ; ou \t)
        first_line = text.splitlines()[0] if text.splitlines() else ""
        delimiter = ','
        if ';' in first_line and first_line.count(';') >= first_line.count(','):
            delimiter = ';'
        elif '\t' in first_line:
            delimiter = '\t'

        reader = csv.DictReader(io.StringIO(text), delimiter=delimiter)
        records = []
        for r in reader:
            cleaned = {}
            for k, v in r.items():
                if k is None:
                    continue
                header = k.strip()
                val = v.strip() if isinstance(v, str) else v
                # Se for número inteiro puro, converte para int apenas se não começar com zero (ex: '001001' continua string!)
                if isinstance(val, str) and val.isdigit():
                    if val.startswith('0') and len(val) > 1:
                        # Preserva zeros à esquerda como string!
                        cleaned[header] = val
                    else:
                        cleaned[header] = int(val)
                elif isinstance(val, str) and val == "":
                    cleaned[header] = None
                else:
                    try:
                        # Tenta float
                        cleaned[header] = float(val) if val is not None else None
                    except (ValueError, TypeError):
                        cleaned[header] = val
            records.append(cleaned)

    else:
        raise ValueError(f"Extensão de arquivo não suportada: {ext}")

    if not records:
        raise ValueError("O arquivo não contém registros válidos.")

    # Gera metadados de colunas
    columns_meta = []
    headers = list(records[0].keys())
    for col in headers:
        values = [r.get(col) for r in records]
        non_nulls = [v for v in values if v is not None and str(v).strip() != ""]
        null_count = len(values) - len(non_nulls)
        null_ratio = null_count / len(values) if values else 1.0

        # Identifica tipo predominante
        col_type = "string"
        if non_nulls:
            if all(isinstance(v, int) for v in non_nulls):
                col_type = "integer"
            elif all(isinstance(v, (int, float)) for v in non_nulls):
                col_type = "float"
            elif all(isinstance(v, bool) for v in non_nulls):
                col_type = "boolean"

        distinct = set(str(v) for v in non_nulls)
        uniqueness_ratio = len(distinct) / len(non_nulls) if non_nulls else 0.0

        columns_meta.append({
            "name": col,
            "type": col_type,
            "nullRatio": round(null_ratio, 3),
            "uniquenessRatio": round(uniqueness_ratio, 3),
            "sampleValues": [str(v) for v in non_nulls[:5]]
        })

    return records, columns_meta
