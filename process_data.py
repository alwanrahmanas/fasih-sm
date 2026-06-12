import os
import csv
import shutil
import subprocess
from datetime import datetime, timezone, timedelta

def get_wita_timestamp():
    # Central Indonesian Time (WITA) is UTC+8
    wita_tz = timezone(timedelta(hours=8))
    now = datetime.now(wita_tz)
    
    months = {
        1: "Januari", 2: "Februari", 3: "Maret", 4: "April", 5: "Mei", 6: "Juni",
        7: "Juli", 8: "Agustus", 9: "September", 10: "Oktober", 11: "November", 12: "Desember"
    }
    
    day = now.day
    month_name = months[now.month]
    year = now.year
    hour_minute = now.strftime("%H.%M")
    
    return f"{day} {month_name} {year} pukul {hour_minute} WITA"

def run_git_commands(timestamp_str):
    print("Starting automatic Git push...")
    try:
        # Check if we are inside a git repository
        git_check = subprocess.run(["git", "rev-parse", "--is-inside-work-tree"], capture_output=True, text=True)
        if git_check.returncode != 0:
            print("Warning: Not a Git repository or Git is not installed. Skipping push.")
            return

        # Add files to git
        files_to_add = [
            "scraped_data.csv",
            "update_data.csv",
            os.path.join("data", "pml_ppl.csv"),
            os.path.join("dashboard", "public", "update_data.csv"),
            os.path.join("dashboard", "public", "pml_ppl.csv"),
            os.path.join("dashboard", "public", "last_updated.txt")
        ]
        
        # Check which files exist and add them
        existing_files = [f for f in files_to_add if os.path.exists(f)]
        if not existing_files:
            print("No output files found to commit.")
            return
            
        subprocess.run(["git", "add"] + existing_files, check=True)
        
        # Check if there are changes staged for commit
        status_check = subprocess.run(["git", "diff", "--cached", "--quiet"])
        if status_check.returncode == 0:
            print("No changes detected in data files. Skipping git commit/push.")
            return
            
        commit_msg = f"Update data: {timestamp_str}"
        print(f"Committing changes with message: '{commit_msg}'...")
        subprocess.run(["git", "commit", "-m", commit_msg], check=True)
        
        print("Pushing to GitHub...")
        subprocess.run(["git", "push"], check=True)
        print("Git push completed successfully!")
    except Exception as e:
        print(f"Warning: Failed to execute Git commands: {e}")

def process_data():
    scraped_file = "scraped_data.csv"
    koseka_file = os.path.join("data", "koseka.csv")
    output_file = "update_data.csv"
    
    print("\n" + "="*50)
    print("STARTING DATA PROCESSING PIPELINE")
    print("="*50)
    
    if not os.path.exists(scraped_file):
        print(f"Error: Scraped data file '{scraped_file}' not found. Cannot process.")
        return False
        
    if not os.path.exists(koseka_file):
        print(f"Error: Koseka mapping file '{koseka_file}' not found. Cannot process.")
        return False
        
    # 1. Load subdistrict and Koseka mapping
    print(f"Loading subdistrict and Koseka mapping from '{koseka_file}'...")
    koseka_map = {}
    try:
        with open(koseka_file, mode='r', encoding='utf-8') as f:
            # Semicolon delimited
            reader = csv.DictReader(f, delimiter=';')
            for row in reader:
                kd_kec = row.get('kd_kec', '').strip()
                if kd_kec:
                    koseka_map[kd_kec] = {
                        'nama_kec': row.get('nama_kec', '').strip(),
                        'koseka': row.get('koseka', '').strip()
                    }
        print(f"Loaded {len(koseka_map)} subdistrict mappings.")
    except Exception as e:
        print(f"Error reading koseka file: {e}")
        return False

    # 2. Process scraped_data.csv
    print(f"Processing and mapping '{scraped_file}'...")
    rows_written = 0
    try:
        with open(scraped_file, mode='r', encoding='utf-8') as infile:
            reader = csv.reader(infile)
            headers = next(reader)
            
            # Append new columns to header
            new_headers = headers + ['nama_kec', 'koseka']
            
            # Find index of 'Kode Identitas'
            id_code_idx = 1
            if 'Kode Identitas' in headers:
                id_code_idx = headers.index('Kode Identitas')
            
            rows_to_write = []
            for row in reader:
                if not row:
                    continue
                
                # Extract digits from the identity code to match with kd_kec
                id_code = row[id_code_idx].strip()
                digits_only = "".join([c for c in id_code if c.isdigit()])
                kd_kec_7 = digits_only[:7]
                
                nama_kec = ""
                koseka = ""
                
                if kd_kec_7 in koseka_map:
                    nama_kec = koseka_map[kd_kec_7]['nama_kec']
                    koseka = koseka_map[kd_kec_7]['koseka']
                
                rows_to_write.append(row + [nama_kec, koseka])
                
        # Write to update_data.csv
        with open(output_file, mode='w', newline='', encoding='utf-8') as outfile:
            writer = csv.writer(outfile)
            writer.writerow(new_headers)
            writer.writerows(rows_to_write)
            
        rows_written = len(rows_to_write)
        print(f"Successfully mapped and created '{output_file}' with {rows_written} rows.")
    except Exception as e:
        print(f"Error mapping scraped data: {e}")
        return False

    # 3. Copy to Next.js dashboard public folder & write timestamp
    public_dir = os.path.join("dashboard", "public")
    if os.path.exists(public_dir):
        print(f"Copying files to dashboard public directory...")
        try:
            # Copy CSV
            shutil.copy2(output_file, os.path.join(public_dir, "update_data.csv"))
            print(f"Copied '{output_file}' to dashboard public folder.")
            
            # Copy PML PPL CSV
            pml_ppl_src = os.path.join("data", "pml_ppl.csv")
            if os.path.exists(pml_ppl_src):
                shutil.copy2(pml_ppl_src, os.path.join(public_dir, "pml_ppl.csv"))
                print(f"Copied '{pml_ppl_src}' to dashboard public folder.")
            
            # Generate and write timestamp
            timestamp = get_wita_timestamp()
            timestamp_file = os.path.join(public_dir, "last_updated.txt")
            with open(timestamp_file, "w", encoding="utf-8") as tf:
                tf.write(timestamp)
            print(f"Wrote timestamp '{timestamp}' to '{timestamp_file}'.")
            
            # Trigger Git automation
            run_git_commands(timestamp)
            
        except Exception as copy_err:
            print(f"Warning: Could not copy files to dashboard public folder or push to Git: {copy_err}")
    else:
        print(f"Warning: Dashboard public directory '{public_dir}' not found. Skipping copy and git push.")
        
    print("="*50 + "\n")
    return True

if __name__ == "__main__":
    process_data()
