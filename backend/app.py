from flask import Flask, request, jsonify
from flask_cors import CORS
import json
import os

app = Flask(__name__)
CORS(app)  # This allows your HTML files to talk to the Python server

MEMORY_FILE = 'memory.json'

# --- ROUTE 1: RECEIVE DATA FROM log.html ---
@app.route('/log-telemetry', methods=['POST'])
def log_telemetry():
    data = request.get_json()
    
    if not data:
        return jsonify({"status": "error", "message": "No data received"}), 400

    print(f">>> DATA RECEIVED: {data}") # Helps you see it in the terminal

    # Load existing logs or start new list
    logs = []
    if os.path.exists(MEMORY_FILE):
        with open(MEMORY_FILE, 'r') as f:
            try:
                logs = json.load(f)
            except:
                logs = []
    
    # Append the new entry
    logs.append(data)
    
    # Save back to memory.json
    with open(MEMORY_FILE, 'w') as f:
        json.dump(logs, f, indent=4)

    return jsonify({"status": "success", "message": "Intel archived in memory.json"})

# --- ROUTE 2: SEND DATA TO dashboard.html ---
@app.route('/get-dashboard-data', methods=['GET'])
def get_dashboard_data():
    if os.path.exists(MEMORY_FILE):
        with open(MEMORY_FILE, 'r') as f:
            try:
                logs = json.load(f)
                if not logs:
                    return jsonify({"status": "error", "message": "Memory file is empty"}), 404
                
                # Send the very last entry (the most recent one) to the dashboard
                return jsonify(logs[-1])
            except Exception as e:
                return jsonify({"status": "error", "message": str(e)}), 500
                
    return jsonify({"status": "error", "message": "No memory file found"}), 404

if __name__ == '__main__':
    # Ensure memory.json exists with at least an empty list
    if not os.path.exists(MEMORY_FILE):
        with open(MEMORY_FILE, 'w') as f:
            json.dump([], f)
            
    print("ALPHARISE BACKEND ACTIVE: http://127.0.0.1:5000")
    app.run(debug=True, port=5000)