// Sound Effects
const soundComplete = new Audio('sound/complete.mp3');
const soundCongrats = new Audio('sound/Congratulations.mp3');
soundCongrats.volume = 0.8;

// App Class
class TodoApp {
    constructor() {
        this.tasks = [];
        this.filter = 'all';
        this.searchQuery = '';
        this.init();
    }

    init() {
        try {
            this.cacheDOM();
            this.loadTasks();
            this.bindEvents();
            this.render();
            this.updateStats();

            // Safety visibility
            document.querySelector('.app-container').style.opacity = 1;

            // GSAP Entrance
            if (typeof gsap !== 'undefined') {
                gsap.from('.app-container', { duration: 1, y: 50, opacity: 0, ease: 'power3.out' });
            }

            window.app = this;

            if (typeof VanillaTilt !== 'undefined') {
                VanillaTilt.init(document.querySelectorAll(".stat-card"), { max: 25, speed: 400, glare: true, "max-glare": 0.5 });
            }
        } catch (e) {
            console.error("Critical Init Error:", e);
            document.querySelector('.app-container').style.opacity = 1;
        }
    }

    cacheDOM() {
        this.taskForm = document.getElementById('task-form');
        this.taskInput = document.getElementById('task-input');
        this.taskCategory = document.getElementById('task-category');
        this.taskTime = document.getElementById('task-time'); // New
        this.taskLocation = document.getElementById('task-location'); // New
        this.taskDesc = document.getElementById('task-desc');
        this.taskFile = document.getElementById('task-file');
        this.taskList = document.getElementById('task-list');
        this.filterTags = document.querySelectorAll('.filter-tag');

        this.statTotal = document.getElementById('stat-total');
        this.statDone = document.getElementById('stat-done');
        this.statPending = document.getElementById('stat-pending');
        this.progressBar = document.getElementById('progress-bar');
        this.progressText = document.getElementById('progress-text');

        this.searchInput = document.getElementById('search-input');
        this.fileLabel = document.querySelector('.file-upload-label');
    }

    bindEvents() {
        if (!this.taskForm) return;

        this.taskForm.addEventListener('submit', (e) => {
            e.preventDefault();
            this.addTask();
        });

        this.taskList.addEventListener('click', (e) => {
            if (e.target.closest('.delete-btn')) {
                const id = e.target.closest('.task-item').dataset.id;
                this.deleteTask(id);
            }
            if (e.target.matches('input[type="checkbox"]')) {
                const id = e.target.closest('.task-item').dataset.id;
                this.toggleTask(id);
            }
        });

        this.filterTags.forEach(tag => {
            tag.addEventListener('click', (e) => {
                this.filterTags.forEach(t => t.classList.remove('active'));
                e.target.classList.add('active');
                this.filter = e.target.dataset.filter;
                this.render();
            });
        });

        if (this.searchInput) {
            this.searchInput.addEventListener('input', (e) => {
                this.searchQuery = e.target.value.toLowerCase().trim();
                this.render();
            });
        }

        this.taskFile.addEventListener('change', (e) => {
            if (e.target.files.length > 0) {
                const file = e.target.files[0];
                if (file.size > 2 * 1024 * 1024) alert("⚠️ Big File Warning: Large images may fill up storage quickly!");
                this.fileLabel.textContent = `📷 ${file.name}`;
            } else {
                this.fileLabel.textContent = '📷 Attach Photo';
            }
        });
    }

    loadTasks() {
        try {
            const stored = localStorage.getItem('tasks');
            if (stored) {
                const parsed = JSON.parse(stored);
                this.tasks = Array.isArray(parsed) ? parsed.filter(t => t && t.id && t.title) : [];
            } else {
                this.tasks = [];
            }
        } catch (e) {
            console.error("Failed to load tasks", e);
            this.tasks = [];
        }
    }

    save() {
        try {
            localStorage.setItem('tasks', JSON.stringify(this.tasks));
        } catch (e) {
            alert("❌ Storage Full! Cannot save new items. Please delete old tasks or photos.");
        }
    }

    compressImage(file) {
        return new Promise((resolve) => {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = (event) => {
                const img = new Image();
                img.src = event.target.result;
                img.onload = () => {
                    const canvas = document.createElement('canvas');
                    const MAX_WIDTH = 800;
                    const scaleSize = MAX_WIDTH / img.width;
                    const width = (img.width > MAX_WIDTH) ? MAX_WIDTH : img.width;
                    const height = (img.width > MAX_WIDTH) ? img.height * scaleSize : img.height;
                    canvas.width = width;
                    canvas.height = height;
                    const ctx = canvas.getContext('2d');
                    ctx.drawImage(img, 0, 0, width, height);
                    resolve(canvas.toDataURL('image/jpeg', 0.7));
                };
            };
        });
    }

    async addTask() {
        const title = this.taskInput.value.trim();
        const category = this.taskCategory.value;
        const time = this.taskTime.value; // Get Time
        const location = this.taskLocation.value.trim(); // Get Location
        const desc = this.taskDesc.value.trim();

        if (!title) return;

        let photoData = null;
        if (this.taskFile.files.length > 0) {
            try {
                this.fileLabel.textContent = '⏳ Compressing...';
                photoData = await this.compressImage(this.taskFile.files[0]);
            } catch (e) {
                console.error("Compression failed", e);
            }
        }

        const newTask = {
            id: Date.now().toString(),
            title,
            desc,
            category,
            time,      // Save Time
            location,  // Save Location
            photo: photoData,
            completed: false,
            createdAt: new Date()
        };

        this.tasks.unshift(newTask);
        this.save();
        this.render();
        this.updateStats();

        // Reset Form
        this.taskInput.value = '';
        this.taskDesc.value = '';
        this.taskTime.value = ''; // Reset Time
        this.taskLocation.value = ''; // Reset Location
        this.taskFile.value = '';
        this.fileLabel.textContent = '📷 Attach Photo';

        gsap.from(`[data-id="${newTask.id}"]`, { duration: 0.6, x: -100, opacity: 0, ease: 'back.out(1.7)' });
    }

    deleteTask(id) {
        if (!confirm("Delete this task?")) return;
        const el = document.querySelector(`[data-id="${id}"]`);
        gsap.to(el, {
            duration: 0.5, x: 100, opacity: 0, ease: 'power2.in', onComplete: () => {
                this.tasks = this.tasks.filter(t => t.id !== id);
                this.save();
                this.render();
                this.updateStats();
            }
        });
    }

    toggleTask(id) {
        const task = this.tasks.find(t => t.id === id);
        if (task) {
            task.completed = !task.completed;
            this.save();
            this.updateStats();

            const el = document.querySelector(`[data-id="${id}"]`);
            if (task.completed) el.classList.add('completed');
            else el.classList.remove('completed');

            if (task.completed) {
                soundComplete.currentTime = 0;
                soundComplete.play();
                this.checkAllCompleted();
            }
        }
    }

    checkAllCompleted() {
        if (this.tasks.length > 0 && this.tasks.every(t => t.completed)) {
            setTimeout(() => {
                soundCongrats.currentTime = 0;
                soundCongrats.play();
                this.triggerConfetti();
            }, 500);
        }
    }

    /* ... Exports (Complete Update) ... */
    exportPDF() {
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();
        doc.setFontSize(18); doc.text("Riel Todo List Report", 14, 20);
        doc.setFontSize(11); doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 28);

        const tableData = this.tasks.map(t => [
            t.category || '-',
            t.title,
            t.time || '-',        // Time Column
            t.location || '-',    // Location Column
            t.completed ? 'Done' : 'Pending',
            new Date(t.createdAt).toLocaleDateString()
        ]);

        doc.autoTable({
            head: [['Category', 'Task', 'Time', 'Location', 'Status', 'Date']],
            body: tableData,
            startY: 35,
            theme: 'grid',
            styles: { fontSize: 9 }, // Smaller font for more cols
            headStyles: { fillColor: [0, 210, 255] }
        });
        doc.save('Riel-Tasks.pdf');
    }

    exportExcel() {
        const wb = XLSX.utils.book_new();
        const data = this.tasks.map(t => ({
            "Category": t.category || "General",
            "Task Title": t.title,
            "Due Time": t.time || "-",
            "Location": t.location || "-",
            "Description": t.desc || "-",
            "Status": t.completed ? "Completed" : "Active",
            "Created": new Date(t.createdAt).toLocaleString()
        }));
        const ws = XLSX.utils.json_to_sheet(data);
        XLSX.utils.book_append_sheet(wb, ws, "Tasks");
        XLSX.writeFile(wb, "Riel-Tasks.xlsx");
    }

    exportTXT() {
        let content = "RIEL TODO LIST\n================\n";
        this.tasks.forEach((t, i) => {
            content += `${i + 1}. [${t.completed ? 'X' : ' '}] [${t.category || 'Gen'}] ${t.title}`;
            if (t.time) content += ` (@ ${t.time})`;
            if (t.location) content += ` in ${t.location}`;
            content += `\n`;
        });
        const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
        this.saveFile(blob, "Riel-Tasks.txt");
    }

    exportJSON() {
        const blob = new Blob([JSON.stringify(this.tasks.map(({ photo, ...rest }) => rest), null, 2)], { type: "application/json" });
        this.saveFile(blob, "Riel-Tasks.json");
    }

    saveFile(blob, filename) {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a'); a.href = url; a.download = filename; a.click();
    }

    updateStats() {
        const total = this.tasks.length;
        const completed = this.tasks.filter(t => t.completed).length;
        const percent = total === 0 ? 0 : Math.round((completed / total) * 100);

        this.statTotal.innerText = total;
        this.statDone.innerText = completed;
        this.statPending.innerText = total - completed;

        this.progressText.innerText = `${percent}%`;
        this.progressBar.style.width = `${percent}%`;
    }

    triggerConfetti() {
        for (let i = 0; i < 50; i++) {
            const s = document.createElement('div');
            s.classList.add('confetti');
            Object.assign(s.style, { position: 'fixed', width: '10px', height: '10px', backgroundColor: `hsl(${Math.random() * 360}, 100%, 50%)`, left: Math.random() * 100 + 'vw', top: '-10px', zIndex: '9999' });
            document.body.appendChild(s);
            gsap.to(s, { y: window.innerHeight + 20, x: (Math.random() - 0.5) * 200, rotation: Math.random() * 360, duration: Math.random() * 2 + 1, ease: 'power1.out', onComplete: () => s.remove() });
        }
    }

    render() {
        this.taskList.innerHTML = '';

        const filtered = this.tasks.filter(task => {
            const matchesFilter = (this.filter === 'active' ? !task.completed : this.filter === 'completed' ? task.completed : true);
            const matchesSearch = task.title.toLowerCase().includes(this.searchQuery) || (task.location && task.location.toLowerCase().includes(this.searchQuery));
            return matchesFilter && matchesSearch;
        });

        if (filtered.length === 0) {
            this.taskList.innerHTML = `<div class="empty-state" style="text-align:center; padding: 3rem; color: var(--text-secondary);"><i class="fas fa-search" style="font-size: 2rem; margin-bottom: 1rem; opacity:0.5;"></i><p>No matching tasks found.</p></div>`;
            return;
        }

        filtered.forEach(task => {
            const el = document.createElement('div');
            el.className = `task-item ${task.completed ? 'completed' : ''}`;
            el.dataset.id = task.id;

            const catBadge = task.category ? `<span class="category-badge cat-${task.category}">${task.category}</span>` : '';

            // New Meta Info for Time/Location
            const timeInfo = task.time ? `<span style="margin-right:1rem;"><i class="far fa-clock"></i> ${task.time}</span>` : '';
            const locInfo = task.location ? `<span><i class="fas fa-map-marker-alt"></i> ${this.escapeHtml(task.location)}</span>` : '';

            el.innerHTML = `
                <label class="task-checkbox-container">
                    <input type="checkbox" ${task.completed ? 'checked' : ''}>
                    <span class="checkmark"></span>
                </label>
                ${task.photo ? `<img src="${task.photo}" class="task-photo" onclick="viewPhoto('${task.photo}')">` : ''}
                <div class="task-content">
                    <div style="margin-bottom: 0.25rem;">${catBadge}</div>
                    <div class="task-title">${this.escapeHtml(task.title)}</div>
                    ${task.desc ? `<div class="task-desc">${this.escapeHtml(task.desc)}</div>` : ''}
                    <div class="task-meta">
                        ${timeInfo} ${locInfo}
                        <span style="float:right; opacity:0.7;">📅 ${new Date(task.createdAt).toLocaleDateString()}</span>
                    </div>
                </div>
                <button class="delete-btn"><i class="fas fa-times"></i></button>
            `;
            this.taskList.appendChild(el);
        });

        VanillaTilt.init(document.querySelectorAll(".task-item"), { max: 3, speed: 400 });
    }

    escapeHtml(text) {
        if (!text) return '';
        const div = document.createElement('div'); div.textContent = text; return div.innerHTML;
    }
}

function viewPhoto(src) {
    const m = document.createElement('div');
    Object.assign(m.style, { position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(0,0,0,0.9)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10000, cursor: 'pointer', backdropFilter: 'blur(10px)' });
    const i = document.createElement('img'); i.src = src;
    Object.assign(i.style, { maxWidth: '90%', maxHeight: '90%', borderRadius: '20px', boxShadow: '0 0 50px rgba(0,210,255,0.3)', transform: 'scale(0)' });
    m.appendChild(i); document.body.appendChild(m);
    gsap.to(i, { transform: 'scale(1)', duration: 0.5, ease: 'elastic.out(1, 0.75)' });
    m.onclick = () => gsap.to(i, { transform: 'scale(0)', duration: 0.3, onComplete: () => m.remove() });
}

document.addEventListener('DOMContentLoaded', () => new TodoApp());
