document.addEventListener("DOMContentLoaded", () => {
    // Auth UI Nodes
    const loginGate = document.getElementById("login-gate");
    const adminMenu = document.getElementById("admin-menu");
    const unlockBtn = document.getElementById("unlockBtn");
    const adminPassword = document.getElementById("adminPassword");
    
    // Upload Nodes
    const uploadBtn = document.getElementById("uploadBtn");
    const fileInput = document.getElementById("adminVideoUpload");
    const folderSelect = document.getElementById("folderSelect");
    const uploadStatus = document.getElementById("uploadStatus");

    let secureToken = "";

    // Mock UI unlock. Real security happens on the server.
    unlockBtn.addEventListener("click", () => {
        const username = document.getElementById("adminUsername").value;
        const password = adminPassword.value;
        
        if (username === "admin" && password === "vcube_2026") {
            // Internally set the secureToken required by the server
            secureToken = "vcube_admin2026";
            loginGate.classList.add("hidden");
            adminMenu.classList.remove("hidden");
        } else {
            alert("❌ Invalid Username or Password!");
        }
    });

    document.getElementById("logoutBtn").addEventListener("click", () => {
        secureToken = "";
        adminPassword.value = "";
        document.getElementById("adminUsername").value = "";
        adminMenu.classList.add("hidden");
        loginGate.classList.remove("hidden");
    });

    // Load videos for a SPECIFIC folder and show delete buttons
    function loadVideoList(filterFolder) {
        const manageList = document.getElementById("manageList");
        manageList.innerHTML = "<p style='color:orange;'>Loading...</p>";

        fetch(`/list?adminToken=${encodeURIComponent(secureToken)}`)
            .then(res => res.json())
            .then(data => {
                manageList.innerHTML = "";
                if (!data.success) {
                    // Show actual error from server (e.g., "Unauthorized")
                    manageList.innerHTML = `<p style='color:red;'>⚠️ ${data.error || "Failed to load videos."}</p>`;
                    return;
                }

                const videos = data.data[filterFolder] || [];
                if (videos.length === 0) {
                    manageList.innerHTML = "<p style='color:white;'>No videos in this folder yet.</p>";
                    return;
                }

                videos.forEach(video => {
                    const row = document.createElement("div");
                    row.style.cssText = "display:flex; justify-content:space-between; align-items:center; background:rgba(255,255,255,0.1); padding:10px 15px; border-radius:8px;";
                    row.innerHTML = `
                        <span style="color:white; font-weight:bold;">🎬 ${video.title}</span>
                        <button data-folder="${filterFolder}" data-filename="${video.filename}" data-title="${video.title}"
                            style="background:red; color:white; border:none; padding:8px 18px; border-radius:5px; cursor:pointer; font-weight:bold; font-size:14px;">
                            🗑️ Delete
                        </button>`;
                    manageList.appendChild(row);
                });

                // Attach delete handlers
                manageList.querySelectorAll("button[data-folder]").forEach(btn => {
                    btn.addEventListener("click", () => {
                        const folder = btn.getAttribute("data-folder");
                        const filename = btn.getAttribute("data-filename");
                        const title = btn.getAttribute("data-title");
                        if (!confirm(`Delete "${title}" from ${folder}?`)) return;

                        const form = new FormData();
                        form.append("adminToken", secureToken);
                        form.append("folder", folder);
                        form.append("filename", filename);
                        form.append("title", title);

                        fetch("/delete", { method: "POST", body: form })
                            .then(r => r.json())
                            .then(d => {
                                if (d.success) {
                                    alert("✅ " + d.message);
                                    loadVideoList(filterFolder);
                                } else {
                                    alert("❌ " + d.error);
                                }
                            });
                    });
                });
            })
            .catch(() => {
                manageList.innerHTML = "<p style='color:red;'>Error connecting to server.</p>";
            });
    }

    // Wire the Load Videos button
    document.getElementById("loadFolderBtn").addEventListener("click", () => {
        const selected = document.getElementById("deletefolderSelect").value;
        if (!selected) {
            document.getElementById("manageList").innerHTML = "<p style='color:orange;'>Please select a folder first!</p>";
            return;
        }
        loadVideoList(selected);
    });

    // Common function for both video and document upload
    function startUpload(fileInputNode) {
        const file = fileInputNode.files[0];
        if (!file) {
            uploadStatus.textContent = "Error: Please select a file first!";
            uploadStatus.style.color = "red";
            return;
        }

        const exactRouteFolder = folderSelect.value;
        const videoTitle = file.name.split('.')[0];
        const CHUNK_SIZE = 5 * 1024 * 1024; // 5MB chunks
        const totalChunks = Math.ceil(file.size / CHUNK_SIZE);
        let currentChunk = 0;

        // UI Feedback elements
        const progressContainer = document.getElementById("progressContainer");
        const progressBar = document.getElementById("progressBar");
        const progressText = document.getElementById("progressText");

        uploadStatus.textContent = "Preparing High-Speed Chunked Upload...";
        uploadStatus.style.color = "orange";
        progressContainer.style.display = "block";
        progressText.style.display = "block";
        progressBar.style.width = "0%";
        progressText.textContent = "0% Uploaded";

        function uploadNextChunk() {
            const start = currentChunk * CHUNK_SIZE;
            const end = Math.min(start + CHUNK_SIZE, file.size);
            const chunk = file.slice(start, end);

            const formData = new FormData();
            formData.append("adminToken", secureToken);
            formData.append("chunk", chunk);
            formData.append("filename", file.name);
            formData.append("chunkIndex", currentChunk);

            const xhr = new XMLHttpRequest();
            xhr.open("POST", "/upload_chunk", true);

            xhr.onload = () => {
                if (xhr.status === 200) {
                    const response = JSON.parse(xhr.responseText);
                    if (response.success) {
                        currentChunk++;
                        const percent = Math.round((currentChunk / totalChunks) * 100);
                        progressBar.style.width = percent + "%";
                        progressText.textContent = `${percent}% Uploaded (Part ${currentChunk}/${totalChunks})`;
                        uploadStatus.textContent = `Uploading part ${currentChunk + 1} of ${totalChunks}...`;

                        if (currentChunk < totalChunks) {
                            uploadNextChunk();
                        } else {
                            finalizeUpload();
                        }
                    } else {
                        handleError(response.error);
                    }
                } else {
                    handleError(`Server returned status ${xhr.status}`);
                }
            };

            xhr.onerror = () => handleError("Network error occurred.");
            xhr.send(formData);
        }

        function finalizeUpload() {
            uploadStatus.textContent = "Finalizing file... please wait.";
            const finalData = new FormData();
            finalData.append("adminToken", secureToken);
            finalData.append("filename", file.name);
            finalData.append("folder", exactRouteFolder);
            finalData.append("title", videoTitle);

            fetch("/finalize_upload", { method: "POST", body: finalData })
                .then(res => res.json())
                .then(data => {
                    if (data.success) {
                        uploadStatus.textContent = "✅ " + data.message;
                        uploadStatus.style.color = "#00ff88";
                        fileInputNode.value = "";
                        setTimeout(() => {
                            progressContainer.style.display = "none";
                            progressText.style.display = "none";
                        }, 5000);
                        
                        const manageFolder = document.getElementById("deletefolderSelect").value;
                        if (manageFolder === exactRouteFolder) {
                            loadVideoList(exactRouteFolder);
                        }
                    } else {
                        handleError(data.error);
                    }
                })
                .catch(() => handleError("Failed to finalize upload."));
        }

        function handleError(msg) {
            uploadStatus.textContent = "❌ Upload Failed: " + msg;
            uploadStatus.style.color = "red";
            progressContainer.style.display = "none";
            progressText.style.display = "none";
        }

        // Start the loop
        uploadNextChunk();
    }

    uploadBtn.addEventListener("click", () => {
        startUpload(fileInput);
    });

    document.getElementById("uploadDocBtn").addEventListener("click", () => {
        startUpload(document.getElementById("adminDocUpload"));
    });

});
