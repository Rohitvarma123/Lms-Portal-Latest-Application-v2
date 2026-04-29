document.addEventListener("DOMContentLoaded", () => {
    // Contact Toggle Logic
    const callUsBtn = document.getElementById('callUsBtn');
    const contactCard = document.getElementById('contactCard');

    if (callUsBtn && contactCard) {
        callUsBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            contactCard.classList.toggle('hidden');
        });

        // Close contact card when clicking elsewhere
        document.addEventListener('click', (e) => {
            if (!contactCard.classList.contains('hidden') && !contactCard.contains(e.target) && e.target !== callUsBtn) {
                contactCard.classList.add('hidden');
            }
        });
    }

    // Menus
    const mainMenu = document.getElementById("main-menu");
    const batchesMenu = document.getElementById("batches-menu");
    const foldersMenu = document.getElementById("folders-menu");
    
    // Buttons
    const videosBtn = document.getElementById("videosBtn");
    const batchBtns = document.querySelectorAll(".batchBtn");
    const backBtnBatches = document.getElementById("backBtnBatches");
    const backBtnFolders = document.getElementById("backBtnFolders");
    
    // New main menu demo & folder demo
    const mainDemoBtn = document.getElementById("mainDemoBtn");
    const folderDemoBtn = document.getElementById("folderDemoBtn");
    
    // Dynamic text
    const currentBatchTitle = document.getElementById("current-batch-title");
    const currentFolderTitle = document.getElementById("current-folder-title");

    // Folder Video Elements
    const videoMenu = document.getElementById("video-menu");
    const folderBtns = document.querySelectorAll(".folderBtn");
    const backBtnVideo = document.getElementById("backBtnVideo");
    const videoPlayer = document.getElementById("videoPlayer");
    // State Tracking
    let currentActiveBatch = "";
    let currentActiveFolderId = ""; // e.g., "Batch-150-Demo"
    let currentMode = "videos"; // "videos" or "documents"
    // Helper: Load videos from DB and render to UI
    function loadVideosForFolder(folderId) {
        const videoList = document.getElementById("videoList");
        videoList.innerHTML = ""; // Clear current UI list
        
        // Use a dynamic cache-busting timestamp to prevent mobile devices from caching the old file!
        fetch("videos.json?t=" + new Date().getTime())
            .then(res => res.json())
            .then(data => {
                const videos = data[folderId] || [];
                
                let filteredRecords = videos.filter(record => {
                    const isPdf = record.filename.toLowerCase().endsWith('.pdf');
                    return currentMode === "documents" ? isPdf : !isPdf;
                });

                if (filteredRecords.length === 0) {
                    videoList.innerHTML = `<p style='color:white; font-weight:bold;'>No ${currentMode} currently available.</p>`;
                    return;
                }
                
                filteredRecords.forEach(record => {
                    const videoItem = document.createElement("a");
                    videoItem.href = "#";
                    videoItem.style.cssText = "padding: 10px 15px; background: orange; color: black; border-radius: 5px; font-weight: bold; text-decoration: none; cursor: pointer;";
                    if (record.filename.toLowerCase().endsWith('.pdf')) {
                        videoItem.textContent = "📄 " + record.title;
                        videoItem.addEventListener("click", (evt) => {
                            evt.preventDefault();
                            window.open(record.filename, "_blank");
                        });
                    } else {
                        videoItem.textContent = "🎬 " + record.title;
                        videoItem.addEventListener("click", (evt) => {
                            evt.preventDefault();
                            const videoPlayer = document.getElementById("videoPlayer");
                            videoPlayer.src = record.filename;
                            videoPlayer.classList.remove("hidden");
                            videoPlayer.play();
                        });
                    }

                    videoList.appendChild(videoItem);
                });
            })
            .catch(err => {
                console.error("Error loading videos.json:", err);
                videoList.innerHTML = "<p style='color:red;'>Could not load videos.</p>";
            });
    }

    // Click on Videos btn to show batches
    videosBtn.addEventListener("click", (e) => {
        e.preventDefault();
        currentMode = "videos";
        mainMenu.classList.add("hidden");
        batchesMenu.classList.remove("hidden");
    });

    const docsBtn = document.getElementById("docsBtn");
    if (docsBtn) {
        docsBtn.addEventListener("click", (e) => {
            e.preventDefault();
            currentMode = "documents";
            mainMenu.classList.add("hidden");
            batchesMenu.classList.remove("hidden");
        });
    }

    // Click on a specific Batch btn to show folders
    batchBtns.forEach(btn => {
        btn.addEventListener("click", (e) => {
            e.preventDefault();
            const batchName = e.target.getAttribute("data-batch");
            currentActiveBatch = batchName;
            currentBatchTitle.textContent = batchName + " Folders";
            
            batchesMenu.classList.add("hidden");
            foldersMenu.classList.remove("hidden");

            // Hide Demo folder for specific batches
            if (batchName === "Batch-150" || batchName === "Batch-151") {
                folderDemoBtn.classList.add("hidden");
            } else {
                folderDemoBtn.classList.remove("hidden");
            }
        });
    });

    // Click on Main Menu Demo button
    mainDemoBtn.addEventListener("click", (e) => {
        e.preventDefault();
        currentActiveBatch = "Main"; 
        currentMode = "videos"; // Demo mostly defaults to videos
        currentFolderTitle.textContent = "View Demo Content";
        
        // Load global Demo videos
        loadVideosForFolder("Demo");
        
        mainMenu.classList.add("hidden");
        videoMenu.classList.remove("hidden");
    });

    // Back from Batches to Main Menu
    backBtnBatches.addEventListener("click", (e) => {
        e.preventDefault();
        batchesMenu.classList.add("hidden");
        mainMenu.classList.remove("hidden");
    });

    // Back from Folders to Batches Menu
    backBtnFolders.addEventListener("click", (e) => {
        e.preventDefault();
        foldersMenu.classList.add("hidden");
        batchesMenu.classList.remove("hidden");
    });

    // Click on any Folder btn to show video upload menu
    folderBtns.forEach(btn => {
        btn.addEventListener("click", (e) => {
            e.preventDefault();
            const folderName = e.target.getAttribute("data-folder");
            currentFolderTitle.textContent = "View " + folderName + " Content";
            currentActiveFolderId = currentActiveBatch + "-" + folderName;
            
            // Load saved videos
            loadVideosForFolder(currentActiveFolderId);
            
            foldersMenu.classList.add("hidden");
            videoMenu.classList.remove("hidden");
        });
    });

    // Back from Video Menu to Folders Menu
    backBtnVideo.addEventListener("click", (e) => {
        e.preventDefault();
        videoMenu.classList.add("hidden");
        foldersMenu.classList.remove("hidden");
        
        // Stop video when backing out
        videoPlayer.pause(); 
    });

    // Optional logic block (File uploading removed)
});
