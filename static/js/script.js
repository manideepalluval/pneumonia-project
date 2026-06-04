let currentResult = null;
let currentFile = null;

// ===== NAVBAR SCROLL =====
window.addEventListener('scroll', () => {
    const navbar = document.getElementById('navbar');
    if (window.scrollY > 50) navbar.classList.add('scrolled');
    else navbar.classList.remove('scrolled');
});

// ===== ACTIVE NAV LINK =====
const sections = document.querySelectorAll('section[id]');
const navLinks = document.querySelectorAll('.nav-link');

window.addEventListener('scroll', () => {
    let current = '';
    sections.forEach(section => {
        const top = section.offsetTop - 100;
        if (window.scrollY >= top) current = section.getAttribute('id');
    });
    navLinks.forEach(link => {
        link.classList.remove('active');
        if (link.getAttribute('href') === `#${current}`) link.classList.add('active');
    });
});

// ===== DROP ZONE =====
const dropZone = document.getElementById('dropZone');
const imageInput = document.getElementById('imageInput');

dropZone.addEventListener('click', () => imageInput.click());

dropZone.addEventListener('dragover', (e) => {
    e.preventDefault();
    dropZone.classList.add('drag-over');
});

dropZone.addEventListener('dragleave', () => dropZone.classList.remove('drag-over'));

dropZone.addEventListener('drop', (e) => {
    e.preventDefault();
    dropZone.classList.remove('drag-over');
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith('image/')) handleFileSelect(file);
});

imageInput.addEventListener('change', (e) => {
    if (e.target.files[0]) handleFileSelect(e.target.files[0]);
});

function handleFileSelect(file) {
    currentFile = file;
    const reader = new FileReader();
    reader.onload = (e) => {
        const previewImg = document.getElementById('previewImg');
        previewImg.src = e.target.result;
        document.getElementById('dropZone').style.display = 'none';
        document.getElementById('previewZone').style.display = 'block';
    };
    reader.readAsDataURL(file);
}

document.getElementById('clearBtn').addEventListener('click', () => {
    currentFile = null;
    imageInput.value = '';
    document.getElementById('dropZone').style.display = 'flex';
    document.getElementById('previewZone').style.display = 'none';
    resetResults();
});

function resetResults() {
    document.getElementById('emptyState').style.display = 'flex';
    document.getElementById('resultContent').style.display = 'none';
    document.getElementById('loadingState').style.display = 'none';
    document.getElementById('reportSection').style.display = 'none';
    currentResult = null;
}

// ===== UPLOAD & PREDICT =====
async function uploadImage() {
    const file = currentFile || (imageInput.files[0] ? imageInput.files[0] : null);

    if (!file) {
        showToast('Please select an X-ray image first.', 'warning');
        return;
    }

    const analyzeBtn = document.getElementById('analyzeBtn');
    analyzeBtn.disabled = true;
    analyzeBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Analyzing...';

    // Show loading
    document.getElementById('emptyState').style.display = 'none';
    document.getElementById('resultContent').style.display = 'none';
    document.getElementById('loadingState').style.display = 'block';
    document.getElementById('reportSection').style.display = 'none';

    const formData = new FormData();
    formData.append('file', file);

    try {
        const response = await fetch('/predict', {
            method: 'POST',
            body: formData
        });

        if (!response.ok) throw new Error('Server error: ' + response.status);

        const data = await response.json();
        currentResult = data;

        // Complete loading bar
        document.getElementById('loadingFill').style.width = '100%';

        setTimeout(() => showResult(data), 400);

    } catch (error) {
        console.error('Prediction error:', error);
        showToast('Analysis failed. Please check your connection and try again.', 'error');
        document.getElementById('loadingState').style.display = 'none';
        document.getElementById('emptyState').style.display = 'flex';
    } finally {
        analyzeBtn.disabled = false;
        analyzeBtn.innerHTML = '<i class="fas fa-magnifying-glass-chart"></i> Run Analysis';
    }
}

// ===== SHOW RESULT =====
function showResult(data) {
    document.getElementById('loadingState').style.display = 'none';
    document.getElementById('resultContent').style.display = 'block';

    // Timestamp
    const now = new Date();
    document.getElementById('resultTime').textContent =
        now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    const isPneumonia = data.result.toLowerCase().includes('pneumonia') &&
                        !data.result.toLowerCase().includes('normal');
    const confidence = parseFloat(data.confidence);

    // Verdict card
    const verdictEl = document.getElementById('resultVerdict');
    verdictEl.className = 'result-verdict ' + (isPneumonia ? 'positive' : 'negative');
    verdictEl.innerHTML = `
        <span class="verdict-icon">${isPneumonia ? '⚠️' : '✅'}</span>
        <div class="verdict-label">${data.result}</div>
        <div class="verdict-sub">${isPneumonia
            ? 'Pneumonia indicators detected in the X-ray'
            : 'No significant pneumonia indicators found'}</div>
    `;

    // Confidence bar
    setTimeout(() => {
        document.getElementById('confidenceFill').style.width = confidence + '%';
    }, 100);
    document.getElementById('confidenceValue').textContent = confidence + '%';

    // Risk badge
    const riskBadge = document.getElementById('riskBadge');
    if (isPneumonia && confidence > 85) {
        riskBadge.textContent = 'High Risk';
        riskBadge.className = 'risk-badge high';
    } else if (isPneumonia && confidence > 60) {
        riskBadge.textContent = 'Moderate Risk';
        riskBadge.className = 'risk-badge medium';
    } else if (!isPneumonia) {
        riskBadge.textContent = 'Low Risk';
        riskBadge.className = 'risk-badge low';
    } else {
        riskBadge.textContent = 'Moderate';
        riskBadge.className = 'risk-badge medium';
    }
}

// ===== GENERATE REPORT =====
async function generateReport() {
    if (!currentResult) return;

    const reportSection = document.getElementById('reportSection');
    const reportLoading = document.getElementById('reportLoading');
    const reportBody = document.getElementById('reportBody');
    const reportBtn = document.getElementById('reportBtn');

    reportSection.style.display = 'block';
    reportLoading.style.display = 'block';
    reportBody.innerHTML = '';

    // Set report date
    document.getElementById('reportDate').textContent =
        new Date().toLocaleDateString('en-US', {
            year: 'numeric', month: 'long', day: 'numeric',
            hour: '2-digit', minute: '2-digit'
        });

    reportBtn.disabled = true;
    reportBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Generating...';

    // Scroll to report
    reportSection.scrollIntoView({ behavior: 'smooth', block: 'start' });

    const isPneumonia = currentResult.result.toLowerCase().includes('pneumonia') &&
                        !currentResult.result.toLowerCase().includes('normal');
    const confidence = parseFloat(currentResult.confidence);

    try {
        const GEMINI_API_KEY = "AIzaSyA9ADZn8C_DXqi-wLZgPMqQcU7GnF9Es-0"; // Paste your new Gemini API key here
        const response = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`,
            {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    contents: [{
                        parts: [{
                            text: `You are a clinical AI assistant specializing in radiology and pulmonology. 
Generate a structured clinical report based on the following chest X-ray AI analysis result:

- AI Prediction: ${currentResult.result}
- Confidence Score: ${confidence}%
- Pneumonia Detected: ${isPneumonia ? 'Yes' : 'No'}

Generate a professional clinical report with these sections:
1. CLINICAL SUMMARY
2. RADIOLOGICAL FINDINGS
3. AI ANALYSIS INTERPRETATION
4. RISK ASSESSMENT
5. RECOMMENDATIONS
6. FOLLOW-UP INSTRUCTIONS
7. DISCLAIMER

Use formal medical language appropriate for a clinical report. 
Format each section header in ALL CAPS. Keep it concise yet clinically informative.
Do NOT use markdown. Use plain text only.`
                        }]
                    }],
                    generationConfig: { maxOutputTokens: 1500 }
                })
            }
        );

        if (!response.ok) {
            throw new Error('API error: ' + response.status);
        }

        const data = await response.json();
        const reportText = data.candidates[0].content.parts[0].text;

        reportLoading.style.display = 'none';
        renderReport(reportText, isPneumonia, confidence);

    } catch (error) {
        console.error('Report generation error:', error);
        // Fallback offline report
        reportLoading.style.display = 'none';
        renderFallbackReport(isPneumonia, confidence);
    }

    reportBtn.disabled = false;
    reportBtn.innerHTML = '<i class="fas fa-file-waveform"></i> Regenerate Report';
}

// ===== RENDER REPORT =====
function renderReport(text, isPneumonia, confidence) {
    const reportBody = document.getElementById('reportBody');
    const now = new Date();

    // Meta info header
    const meta = `
        <div class="report-meta">
            <div class="meta-item">
                <div class="meta-key">Report ID</div>
                <div class="meta-val">RPT-${Math.random().toString(36).substr(2,8).toUpperCase()}</div>
            </div>
            <div class="meta-item">
                <div class="meta-key">Date & Time</div>
                <div class="meta-val">${now.toLocaleDateString()} ${now.toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</div>
            </div>
            <div class="meta-item">
                <div class="meta-key">AI Verdict</div>
                <div class="meta-val" style="color: ${isPneumonia ? 'var(--red)' : 'var(--green)'};">${isPneumonia ? 'Pneumonia Detected' : 'Normal'}</div>
            </div>
            <div class="meta-item">
                <div class="meta-key">Confidence</div>
                <div class="meta-val">${confidence}%</div>
            </div>
        </div>`;

    // Parse and format sections
    const sections = text.split('\n').filter(l => l.trim());
    let html = meta;

    sections.forEach(line => {
        const trimmed = line.trim();
        if (!trimmed) return;

        // Section header: ALL CAPS lines
        if (/^[A-Z][A-Z\s\d:&\/]+$/.test(trimmed) && trimmed.length > 3) {
            html += `<h4>${trimmed}</h4>`;
        } else if (trimmed.startsWith('-') || trimmed.startsWith('•')) {
            html += `<p style="padding-left:16px">• ${trimmed.replace(/^[-•]\s*/, '')}</p>`;
        } else {
            html += `<p>${trimmed}</p>`;
        }
    });

    reportBody.innerHTML = html;
}

function renderFallbackReport(isPneumonia, confidence) {
    const reportBody = document.getElementById('reportBody');
    const now = new Date();

    reportBody.innerHTML = `
        <div class="report-meta">
            <div class="meta-item">
                <div class="meta-key">Report ID</div>
                <div class="meta-val">RPT-${Math.random().toString(36).substr(2,8).toUpperCase()}</div>
            </div>
            <div class="meta-item">
                <div class="meta-key">Date</div>
                <div class="meta-val">${now.toLocaleDateString()}</div>
            </div>
            <div class="meta-item">
                <div class="meta-key">AI Verdict</div>
                <div class="meta-val" style="color:${isPneumonia ? 'var(--red)' : 'var(--green)'}">
                    ${isPneumonia ? 'Pneumonia Detected' : 'Normal'}
                </div>
            </div>
            <div class="meta-item">
                <div class="meta-key">Confidence</div>
                <div class="meta-val">${confidence}%</div>
            </div>
        </div>

        <h4>CLINICAL SUMMARY</h4>
        <p>AI-based chest X-ray analysis has been completed. The model returned a prediction of 
        <strong>${isPneumonia ? 'Pneumonia Detected' : 'Normal'}</strong> with a confidence of ${confidence}%.</p>

        <h4>RADIOLOGICAL FINDINGS</h4>
        <p>${isPneumonia
            ? 'The deep learning model identified radiographic patterns consistent with pulmonary consolidation or infiltrates, which are characteristic findings of pneumonia.'
            : 'No significant radiographic abnormalities were identified in the analyzed chest X-ray. Lung fields appear clear.'}</p>

        <h4>RISK ASSESSMENT</h4>
        <p>${isPneumonia && confidence > 85 ? 'High risk. Immediate clinical evaluation strongly recommended.' :
            isPneumonia ? 'Moderate risk. Clinical correlation recommended.' :
            'Low risk based on current analysis. Routine follow-up advised.'}</p>

        <h4>RECOMMENDATIONS</h4>
        <p>${isPneumonia
            ? '1. Immediate consultation with a pulmonologist or infectious disease specialist.\n2. Blood work including CBC, CRP, and procalcitonin levels.\n3. Consider sputum culture if productive cough present.\n4. Evaluate for antibiotic therapy based on clinical presentation.'
            : '1. Continue routine health monitoring.\n2. Report any new respiratory symptoms to a healthcare provider.\n3. Maintain regular vaccination schedule including influenza and pneumococcal vaccines.'}</p>

        <h4>DISCLAIMER</h4>
        <p>This report is generated by an AI system and is intended solely for decision support. 
        It must be reviewed and validated by a licensed medical professional before any clinical decisions are made. 
        This report does not constitute a medical diagnosis.</p>`;
}

// ===== PRINT REPORT =====
function printReport() {
    const reportContent = document.getElementById('reportBody').innerHTML;
    const win = window.open('', '_blank');
    win.document.write(`
        <html><head><title>PneumoScan AI — Clinical Report</title>
        <style>
            body { font-family: Georgia, serif; max-width: 800px; margin: 40px auto; padding: 0 20px; color: #1a1a2e; line-height: 1.7; }
            h4 { font-size: 12px; text-transform: uppercase; letter-spacing: 1.5px; color: #1f3c88; margin: 24px 0 8px; padding-bottom: 6px; border-bottom: 1px solid #e0e6f0; }
            p { margin-bottom: 8px; font-size: 14px; }
            .report-meta { display: flex; gap: 24px; background: #f5f7fb; padding: 16px; border-radius: 8px; margin-bottom: 24px; flex-wrap: wrap; }
            .meta-item { min-width: 120px; }
            .meta-key { font-size: 10px; text-transform: uppercase; letter-spacing: 1px; color: #888; }
            .meta-val { font-size: 14px; font-weight: 600; font-family: monospace; }
            @media print { body { margin: 20px; } }
        </style></head>
        <body>
        <h1 style="font-size:22px;color:#1f3c88;margin-bottom:4px">PneumoScan AI — Clinical Report</h1>
        <p style="color:#888;font-size:13px;margin-bottom:32px">AI-Powered Chest X-Ray Analysis System</p>
        ${reportContent}
        <hr style="margin-top:40px;border:none;border-top:1px solid #e0e6f0">
        <p style="font-size:11px;color:#aaa;margin-top:12px">Generated by PneumoScan AI. For clinical decision support only.</p>
        </body></html>`);
    win.document.close();
    setTimeout(() => win.print(), 500);
}

// ===== COPY REPORT =====
function copyReport() {
    const text = document.getElementById('reportBody').innerText;
    navigator.clipboard.writeText(text).then(() => {
        showToast('Report copied to clipboard!', 'success');
    });
}

// ===== TOAST NOTIFICATIONS =====
function showToast(message, type = 'info') {
    const existing = document.querySelector('.toast');
    if (existing) existing.remove();

    const colors = {
        success: '#10b981',
        warning: '#f59e0b',
        error: '#ef4444',
        info: '#3b82f6'
    };

    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.style.cssText = `
        position: fixed; bottom: 24px; right: 24px; z-index: 9999;
        padding: 14px 20px;
        background: #1a2235;
        border: 1px solid ${colors[type]}44;
        border-left: 3px solid ${colors[type]};
        color: #f0f4ff;
        border-radius: 10px;
        font-family: 'DM Sans', sans-serif;
        font-size: 14px;
        box-shadow: 0 8px 32px rgba(0,0,0,0.5);
        animation: slideIn 0.3s ease;
        max-width: 320px;
    `;
    toast.textContent = message;
    document.body.appendChild(toast);

    const style = document.createElement('style');
    style.textContent = `@keyframes slideIn { from { transform: translateX(100%); opacity: 0; } to { transform: translateX(0); opacity: 1; } }`;
    document.head.appendChild(style);

    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateX(100%)';
        toast.style.transition = 'all 0.3s ease';
        setTimeout(() => toast.remove(), 300);
    }, 3500);
}

// ===== INTERSECTION OBSERVER ANIMATIONS =====
const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.style.animationPlayState = 'running';
        }
    });
}, { threshold: 0.1 });

document.querySelectorAll('.about-card, .step-card').forEach(el => {
    el.style.animationPlayState = 'paused';
    observer.observe(el);
});
