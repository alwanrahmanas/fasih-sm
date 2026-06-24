import os
import json
import zipfile
import re
import xml.etree.ElementTree as ET

def parse_xlsx(filename):
    try:
        with zipfile.ZipFile(filename, 'r') as z:
            shared_strings = []
            if 'xl/sharedStrings.xml' in z.namelist():
                ss_data = z.read('xl/sharedStrings.xml')
                root_ss = ET.fromstring(ss_data)
                ns = {'ns': 'http://schemas.openxmlformats.org/spreadsheetml/2006/main'}
                for si in root_ss.findall('.//ns:si', ns):
                    t_elements = si.findall('.//ns:t', ns)
                    text = "".join([t.text for t in t_elements if t.text is not None])
                    shared_strings.append(text)
            
            sheet_data = z.read('xl/worksheets/sheet1.xml')
            root_sheet = ET.fromstring(sheet_data)
            ns = {'ns': 'http://schemas.openxmlformats.org/spreadsheetml/2006/main'}
            
            rows = {}
            for row in root_sheet.findall('.//ns:row', ns):
                row_idx = int(row.get('r'))
                row_cells = {}
                for c in row.findall('ns:c', ns):
                    cell_ref = c.get('r')
                    col_letter = ''.join([char for char in cell_ref if not char.isdigit()])
                    val_elem = c.find('ns:v', ns)
                    val = None
                    if val_elem is not None:
                        val = val_elem.text
                        cell_type = c.get('t')
                        if cell_type == 's' and val is not None:
                            idx = int(val)
                            if idx < len(shared_strings):
                                val = shared_strings[idx]
                    row_cells[col_letter] = val
                rows[row_idx] = row_cells
            return rows
    except Exception as e:
        print(f"Error reading {filename}: {e}")
        return {}

def process_mitra():
    rows = parse_xlsx('mitra-email.xlsx')
    petugas_list = []
    emails = []
    
    for row_idx in sorted(rows.keys()):
        if row_idx == 1:
            continue
        row_data = rows[row_idx]
        nama = row_data.get('A')
        jabatan = row_data.get('B')
        kec_raw = row_data.get('H')
        email = row_data.get('U')
        
        if not nama or not email or '@' not in str(email):
            continue
            
        # Clean kecamatan string: e.g. "(101) KAMBOWA" -> "KAMBOWA"
        kec = ""
        if kec_raw:
            kec = re.sub(r'^\(\d+\)\s*', '', str(kec_raw)).strip().upper()
            
        nama = str(nama).strip()
        jabatan = str(jabatan).strip() if jabatan else ""
        email = str(email).strip()
        
        if "WAKORUMBA" in kec:
            kec = "WAKORUMBA UTARA"
            
        petugas_list.append({
            'nama': nama,
            'kec': kec,
            'jabatan': jabatan,
            'email': email
        })
        
        if email and email not in emails:
            emails.append(email)
            
    with open('data/email_mitra.txt', 'w', encoding='utf-8') as f:
        for email in emails:
            f.write(email + '\n')
            
    with open('data/email_mitra_test.txt', 'w', encoding='utf-8') as f:
        for email in emails[:3]:
            f.write(email + '\n')
            
    with open('data/pml_ppl.csv', 'w', encoding='utf-8') as f:
        f.write("nama_petugas;kec;jabatan_petugas;email\n")
        for p in petugas_list:
            f.write(f"{p['nama']};{p['kec']};{p['jabatan']};{p['email']}\n")
            
    print(f"[OK] Parsed Mitra: {len(petugas_list)} petugas, {len(emails)} unique emails")

def process_prelist():
    rows = parse_xlsx('prelist_se2026.xlsx')
    
    sbr_data = {
        "kab": {},
        "kec": {},
        "desa": {},
        "sls": []
    }
    
    total_usaha = 0
    sls_dict = {}
    
    for row_idx in sorted(rows.keys()):
        if row_idx == 1:
            continue
        row_data = rows[row_idx]
        kdprov = str(row_data.get('D', '')).strip()
        kdkab = str(row_data.get('E', '')).strip()
        kdkec = str(row_data.get('F', '')).strip()
        kddesa = str(row_data.get('G', '')).strip()
        kdsls = str(row_data.get('H', '')).strip()
        skala = str(row_data.get('N', '')).upper().strip()
        
        if not kdprov or not kdkab or kdprov == 'None' or kdkab == 'None':
            continue
            
        kab_code = kdkab if len(kdkab) == 4 else (kdprov + kdkab)
        kec_code = kdkec
        desa_code = kddesa
        sls_code = kdsls
        
        if len(kab_code) != 4 or not kab_code.startswith('7409'):
            continue
            
        for code, level in [(kab_code, 'kab'), (kec_code, 'kec'), (desa_code, 'desa')]:
            if not code or code == 'None': continue
            if code not in sbr_data[level]:
                sbr_data[level][code] = {"kode": code, "UB": 0, "UM": 0, "UMK": 0, "Total": 0}
            
            sbr_data[level][code]["Total"] += 1
            if "UMB" in skala:
                sbr_data[level][code]["UMB"] = sbr_data[level][code].get("UMB", 0) + 1
                sbr_data[level][code]["UB"] += 1
            elif "UMK" in skala:
                sbr_data[level][code]["UMK"] += 1
            else:
                sbr_data[level][code]["UM"] += 1
                
        if sls_code and sls_code != 'None':
            if sls_code not in sls_dict:
                sls_dict[sls_code] = {"kode": sls_code, "UB": 0, "UM": 0, "UMK": 0, "Total": 0}
            sls_dict[sls_code]["Total"] += 1
            if "UMB" in skala:
                sls_dict[sls_code]["UMB"] = sls_dict[sls_code].get("UMB", 0) + 1
                sls_dict[sls_code]["UB"] += 1
            elif "UMK" in skala:
                sls_dict[sls_code]["UMK"] += 1
            else:
                sls_dict[sls_code]["UM"] += 1
                
        total_usaha += 1
        
    sbr_data["sls"] = list(sls_dict.values())
    
    final_sbr = {
        "kab": list(sbr_data["kab"].values()),
        "kec": list(sbr_data["kec"].values()),
        "desa": list(sbr_data["desa"].values()),
        "sls": sbr_data["sls"],
        "sub_sls": []
    }
    
    with open('dashboard/public/sbr_data.json', 'w', encoding='utf-8') as f:
        json.dump(final_sbr, f, indent=2)
        
    print(f"[OK] Parsed Prelist: {total_usaha} SBR records mapped with SLS targets.")

def write_default_koseka():
    koseka_data = """kd_kec;nama_kec;koseka
7409010;BONEGUNU;
7409020;KULISUSU;
7409030;KULISUSU BARAT;
7409040;KULISUSU UTARA;
7409050;KAMBOWA;
7409060;WAKORUMBA UTARA;
"""
    with open('data/koseka.csv', 'w', encoding='utf-8') as f:
        f.write(koseka_data)
    print("[OK] Reset data/koseka.csv to default Buton Utara kecamatans.")

if __name__ == '__main__':
    process_mitra()
    process_prelist()
    write_default_koseka()
