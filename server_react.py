from flask import Flask, request, jsonify, send_from_directory
import os
import json
from werkzeug.utils import secure_filename

app = Flask(__name__)
app.config['MAX_CONTENT_LENGTH'] = 5 * 1024 * 1024 * 1024  # 5GB

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
JSON_FILE = os.path.join(BASE_DIR, 'videos.json')

def read_json():
    if not os.path.exists(JSON_FILE): return {}
    with open(JSON_FILE, 'r', encoding='utf-8') as f:
        try: return json.load(f)
        except: return {}

def write_json(data):
    with open(JSON_FILE, 'w', encoding='utf-8') as f:
        json.dump(data, f, indent=4)

@app.route('/')
def index():
    return send_from_directory(os.path.join(BASE_DIR, 'client', 'dist'), 'index.html')

@app.route('/assets/<path:filename>')
def serve_assets(filename):
    return send_from_directory(os.path.join(BASE_DIR, 'client', 'dist', 'assets'), filename)

@app.route('/list', methods=['GET'])
def list_videos():
    MASTER_PASSWORD = "vcube_admin2026"
    token = request.args.get('adminToken', '')
    if token != MASTER_PASSWORD:
        return jsonify({"success": False, "error": "401 UNAUTHORIZED"}), 401
    return jsonify({"success": True, "data": read_json()})

@app.route('/upload_chunk', methods=['POST'])
def upload_chunk():
    MASTER_PASSWORD = "vcube_admin2026"
    if request.form.get('adminToken') != MASTER_PASSWORD:
        return jsonify({"success": False, "error": "401 UNAUTHORIZED"}), 401
    
    file = request.files.get('chunk')
    filename = request.form.get('filename')
    chunk_index = int(request.form.get('chunkIndex', 0))
    
    if not file or not filename:
        return jsonify({"success": False, "error": "Missing data"}), 400

    safe_name = secure_filename(filename)
    temp_path = os.path.join(BASE_DIR, f"{safe_name}.part")

    if chunk_index == 0:
        print(f"INFO: Starting new upload: {safe_name}")
        if os.path.exists(temp_path):
            os.remove(temp_path)

    try:
        with open(temp_path, "ab") as f:
            f.write(file.read())
        return jsonify({"success": True, "message": "Chunk received"})
    except Exception as e:
        print(f"ERROR: Chunk write failed for {safe_name}: {e}")
        return jsonify({"success": False, "error": str(e)}), 500

@app.route('/finalize_upload', methods=['POST'])
def finalize_upload():
    MASTER_PASSWORD = "vcube_admin2026"
    if request.form.get('adminToken') != MASTER_PASSWORD:
        return jsonify({"success": False, "error": "401 UNAUTHORIZED"}), 401

    filename = request.form.get('filename')
    folder = request.form.get('folder', 'Demo')
    title = request.form.get('title', 'Untitled')

    safe_name = secure_filename(filename)
    temp_path = os.path.join(BASE_DIR, f"{safe_name}.part")
    final_path = os.path.join(BASE_DIR, safe_name)

    if os.path.exists(temp_path):
        if os.path.exists(final_path): os.remove(final_path)
        os.rename(temp_path, final_path)
        
        db = read_json()
        if folder not in db: db[folder] = []
        db[folder].append({"title": title, "filename": safe_name})
        write_json(db)
        return jsonify({"success": True, "message": "Upload complete!"})
    
    return jsonify({"success": False, "error": "File not found"}), 404

@app.route('/delete', methods=['POST'])
def delete_video():
    MASTER_PASSWORD = "vcube_admin2026"
    if request.form.get('adminToken') != MASTER_PASSWORD:
        return jsonify({"success": False, "error": "401 UNAUTHORIZED"}), 401

    folder = request.form.get('folder')
    filename = request.form.get('filename')
    title = request.form.get('title')

    db = read_json()
    if folder in db:
        db[folder] = [v for v in db[folder] if not (v['filename'] == filename and v['title'] == title)]
        write_json(db)
        
        # Optional: delete physical file if not used elsewhere
        return jsonify({"success": True, "message": "Deleted successfully"})
    return jsonify({"success": False, "error": "Folder not found"}), 404

@app.route('/<path:filename>')
def serve_others(filename):
    file_path = os.path.join(BASE_DIR, filename)
    if os.path.exists(file_path) and os.path.isfile(file_path):
        return send_from_directory(BASE_DIR, filename)
    return send_from_directory(os.path.join(BASE_DIR, 'client', 'dist'), 'index.html')

if __name__ == '__main__':
    from waitress import serve
    print("Vcube Secure Engine (Full React Version) on port 5000")
    serve(app, host='0.0.0.0', port=5000, max_request_body_size=5*1024*1024*1024, threads=6)
