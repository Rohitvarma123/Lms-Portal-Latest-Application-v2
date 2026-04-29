from flask import Flask, request, jsonify
import os
import json
from werkzeug.utils import secure_filename

app = Flask(__name__, static_url_path='', static_folder='.')
app.config['MAX_CONTENT_LENGTH'] = 5 * 1024 * 1024 * 1024  # Allow up to 5GB video uploads

# Run this script directly inside your /var/www/mywebsite/ folder!
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
JSON_FILE = os.path.join(BASE_DIR, 'videos.json')

# Helper function to read videos.json
def read_json():
    if not os.path.exists(JSON_FILE):
        return {}
    with open(JSON_FILE, 'r') as f:
        try:
            return json.load(f)
        except json.JSONDecodeError:
            return {}

# Helper function to write back to videos.json
def write_json(data):
    with open(JSON_FILE, 'w') as f:
        json.dump(data, f, indent=4)

@app.route('/')
def index():
    return app.send_static_file('index.html')

@app.route('/admin')
def admin_page():
    return app.send_static_file('admin.html')

@app.route('/upload_chunk', methods=['POST'])
def upload_chunk():
    MASTER_PASSWORD = "vcube_admin2026"
    provided_token = request.form.get('adminToken', '')
    if provided_token != MASTER_PASSWORD:
        return jsonify({"success": False, "error": "401 UNAUTHORIZED"}), 401

    file = request.files.get('chunk')
    filename = request.form.get('filename')
    
    if not file or not filename:
        return jsonify({"success": False, "error": "Missing chunk or filename"}), 400

    safe_name = secure_filename(filename)
    temp_path = os.path.join(BASE_DIR, f"{safe_name}.part")

    import time
    max_retries = 5
    success_write = False
    chunk_data = file.read()
    
    for i in range(max_retries):
        try:
            with open(temp_path, "ab") as f:
                f.write(chunk_data)
            success_write = True
            break
        except PermissionError:
            time.sleep(0.5)

    if not success_write:
        return jsonify({"success": False, "error": "Server error: File locked by system process during upload."}), 500

    return jsonify({"success": True, "message": "Chunk received"})

@app.route('/finalize_upload', methods=['POST'])
def finalize_upload():
    MASTER_PASSWORD = "vcube_admin2026"
    provided_token = request.form.get('adminToken', '')
    if provided_token != MASTER_PASSWORD:
        return jsonify({"success": False, "error": "401 UNAUTHORIZED"}), 401

    filename = request.form.get('filename')
    folder_route = request.form.get('folder', 'Unknown-Folder')
    title = request.form.get('title', 'Untitled Video')

    if not filename:
        return jsonify({"success": False, "error": "Missing filename"}), 400

    safe_name = secure_filename(filename)
    temp_path = os.path.join(BASE_DIR, f"{safe_name}.part")
    final_path = os.path.join(BASE_DIR, safe_name)

    if not os.path.exists(temp_path):
        return jsonify({"success": False, "error": "Upload data not found on server"}), 404

    import time
    max_retries = 5
    success_rename = False
    
    for i in range(max_retries):
        try:
            if os.path.exists(final_path):
                os.remove(final_path)
            os.rename(temp_path, final_path)
            success_rename = True
            break
        except PermissionError:
            time.sleep(0.5)
            
    if not success_rename:
        return jsonify({"success": False, "error": "Server error: File is currently locked by another process (e.g., Antivirus). Please wait a moment and try uploading again."}), 500

    db = read_json()
    if folder_route not in db:
        db[folder_route] = []
    
    db[folder_route] = [v for v in db[folder_route] if v['title'] != title]
    db[folder_route].append({
        "title": title,
        "filename": safe_name
    })
    write_json(db)

    print(f"INFO: Successfully saved '{title}' to {final_path}")
    return jsonify({"success": True, "message": f"Successfully finalized '{title}'!"})

@app.route('/list', methods=['GET'])
def list_videos():
    MASTER_PASSWORD = "vcube_admin2026"
    token = request.args.get('adminToken', '')
    if token != MASTER_PASSWORD:
        return jsonify({"success": False, "error": "401 UNAUTHORIZED: Please check your password."}), 401
    db = read_json()
    return jsonify({"success": True, "data": db})


@app.route('/delete', methods=['POST'])
def delete_video():
    MASTER_PASSWORD = "vcube_admin2026"
    provided_token = request.form.get('adminToken', '')
    if provided_token != MASTER_PASSWORD:
        return jsonify({"success": False, "error": "401 UNAUTHORIZED: Incorrect Master Password!"}), 401

    folder_route = request.form.get('folder', '')
    filename = request.form.get('filename', '')
    title = request.form.get('title', '')

    if not folder_route or not filename:
        return jsonify({"success": False, "error": "Missing folder or filename!"}), 400

    db = read_json()

    if folder_route not in db:
        return jsonify({"success": False, "error": "Folder not found!"}), 404

    # Remove from JSON list
    original_count = len(db[folder_route])
    db[folder_route] = [v for v in db[folder_route] if not (v['filename'] == filename and v['title'] == title)]

    if len(db[folder_route]) == original_count:
        return jsonify({"success": False, "error": "Video entry not found in JSON!"}), 404

    write_json(db)

    # Also delete the physical file if no other folder references it
    all_filenames = [v['filename'] for vlist in db.values() for v in vlist]
    if filename not in all_filenames:
        file_path = os.path.join(BASE_DIR, filename)
        if os.path.exists(file_path):
            os.remove(file_path)

    return jsonify({"success": True, "message": f"'{title}' deleted successfully!"})

if __name__ == '__main__':
    # Use Waitress for production. This handles large uploads and concurrent requests much better.
    try:
        from waitress import serve
        print("DEPLOYED: Starting Vcube Secure Engine via Waitress on port 5000...")
        # Ensure Waitress allows the same 5GB limit
        serve(app, host='0.0.0.0', port=5000, max_request_body_size=5*1024*1024*1024, threads=4)
    except ImportError:
        print("WARNING: Waitress package not found. Using low-performance Flask server.")
        print("FIX: Run 'pip install waitress' to enable stable large-file uploads.")
        app.run(host='0.0.0.0', port=5000, debug=False)
