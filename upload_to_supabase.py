import json
import urllib.request
import urllib.error

url = "https://ehaehtdtgerrxbgtxfkp.supabase.co/rest/v1/order_items"
key = "sb_publishable_CxuT25cVkj4pxnCswy7jcA_-fPL55y1"

headers = {
    "apikey": key,
    "Authorization": f"Bearer {key}",
    "Content-Type": "application/json",
    "Prefer": "return=minimal"
}

def delete_all():
    print("Deleting existing rows...")
    req = urllib.request.Request(f"{url}?id=not.is.null", method="DELETE", headers=headers)
    try:
        with urllib.request.urlopen(req) as response:
            pass
    except urllib.error.HTTPError as e:
        print("Delete error:", e.code, e.read().decode())

def insert_batch(records):
    req = urllib.request.Request(url, data=json.dumps(records).encode('utf-8'), method="POST", headers=headers)
    try:
        with urllib.request.urlopen(req) as response:
            return True
    except urllib.error.HTTPError as e:
        print("Insert error:", e.code, e.read().decode())
        return False

if __name__ == "__main__":
    delete_all()
    
    with open('c:/Users/higashi/Projects/039_sales_system/prototype-app/src/gcga_data.json', 'r', encoding='utf-8') as f:
        data = json.load(f)
        
    for row in data:
        if 'memo' in row:
            row['comments'] = row.pop('memo')
        if 'ship_date' in row:
            row.pop('ship_date')
            
    print(f"Loaded {len(data)} records. Inserting in batches...")
    
    batch_size = 1000
    success = 0
    for i in range(0, len(data), batch_size):
        batch = data[i:i+batch_size]
        print(f"Uploading batch {i} to {i+len(batch)}...")
        if insert_batch(batch):
            success += len(batch)
            
    print(f"Upload complete. {success} records inserted.")
