function initTextControls() {
    const thumbnailTextInput = document.getElementById('thumbnailText');
    const thumbnailText = document.getElementById('thumbnailTextLarge');
    const fontFamilySelect = document.getElementById('fontFamily');
    const fontSizeInput = document.getElementById('fontSize');
    const textColorInput = document.getElementById('textColor');
    const textOutlineInput = document.getElementById('textOutline');
    const outlineColorInput = document.getElementById('outlineColor');
    const textBackgroundInput = document.getElementById('textBackground');
    const backgroundSizeInput = document.getElementById('backgroundSize');
    const backgroundColorInput = document.getElementById('backgroundColor');
    const generalBackgroundInput = document.getElementById('generalBackground');
    const generalBackgroundColorInput = document.getElementById('generalBackgroundColor');

    thumbnailTextInput.addEventListener('input', updateThumbnailText);
    fontFamilySelect.addEventListener('change', updateTextStyle);
    fontSizeInput.addEventListener('input', updateTextStyle);
    textColorInput.addEventListener('input', updateTextStyle);
    textOutlineInput.addEventListener('change', updateTextStyle);
    outlineColorInput.addEventListener('input', updateTextStyle);
    textBackgroundInput.addEventListener('change', updateTextStyle);
    backgroundSizeInput.addEventListener('input', updateTextStyle);
    backgroundColorInput.addEventListener('input', updateTextStyle);
    generalBackgroundInput.addEventListener('change', updateTextStyle);
    generalBackgroundColorInput.addEventListener('input', updateTextStyle);

    thumbnailText.addEventListener('mousedown', startDragging);
    initResizeHandles();

    thumbnailText.style.width = '50%';
    thumbnailText.style.height = '50%';
    thumbnailText.style.left = '25%';
    thumbnailText.style.top = '25%';
}

function updateThumbnailText() {
    const text = document.getElementById('thumbnailText').value;
    const thumbnailText = document.getElementById('thumbnailTextLarge');

    const textContent = thumbnailText.querySelector('.text-content') || document.createElement('div');
    textContent.className = 'text-content';

    textContent.innerHTML = text.split(' ').map(word =>
        `<span class="word">${word.split('').map(char =>
            `<span class="char"><span class="char-background"></span>${char}</span>`
        ).join('')}</span>`
    ).join(' ');

    if (!thumbnailText.contains(textContent)) {
        thumbnailText.appendChild(textContent);
    }

    textContent.style.whiteSpace = 'normal';
    textContent.style.wordBreak = 'normal';
    textContent.style.wordWrap = 'break-word';

    const words = textContent.querySelectorAll('.word');
    words.forEach(word => {
        word.style.display = 'inline-block';
        word.style.whiteSpace = 'nowrap';
    });

    ensureResizeHandles(thumbnailText);
    updateTextStyle();
}

function ensureResizeHandles(textElement) {
    const handles = ['top-left', 'top-right', 'bottom-left', 'bottom-right'];
    handles.forEach(position => {
        let handle = textElement.querySelector(`.resize-handle.${position}`);
        if (!handle) {
            handle = document.createElement('div');
            handle.className = `resize-handle ${position}`;
            textElement.appendChild(handle);
        }
    });
}

function updateTextStyle() {
    const fontFamily = document.getElementById('fontFamily').value;
    const fontSize = document.getElementById('fontSize').value;
    const textColor = document.getElementById('textColor').value;
    const textOutline = document.getElementById('textOutline').checked;
    const outlineColor = document.getElementById('outlineColor').value;
    const textBackground = document.getElementById('textBackground').checked;
    const backgroundColor = document.getElementById('backgroundColor').value;
    const backgroundSize = document.getElementById('backgroundSize').value;
    const generalBackground = document.getElementById('generalBackground').checked;
    const generalBackgroundColor = document.getElementById('generalBackgroundColor').value;

    const textElement = document.getElementById('thumbnailTextLarge');
    const textContent = textElement.querySelector('.text-content');
    if (textContent) {
        textContent.style.fontFamily = `'${fontFamily}', sans-serif`;
        textContent.style.fontSize = `${fontSize}px`;
        textContent.style.color = textColor;
        textContent.style.textShadow = textOutline ? `
            -1px -1px 0 ${outlineColor},  
             1px -1px 0 ${outlineColor},
            -1px  1px 0 ${outlineColor},
             1px  1px 0 ${outlineColor}
        ` : 'none';

        const chars = textContent.querySelectorAll('.char');
        chars.forEach(char => {
            const background = char.querySelector('.char-background');
            if (textBackground) {
                background.style.backgroundColor = backgroundColor;
                const padding = backgroundSize / 20;
                background.style.top = `-${padding + 1}px`;
                background.style.bottom = `-${padding + 1}px`;
                background.style.left = `-${padding + 3}px`;
                background.style.right = `-${padding + 3}px`;
                background.style.display = 'block';
            } else {
                background.style.display = 'none';
            }
        });

        const generalBackgroundElement = textElement.querySelector('.text-background');
        if (generalBackground) {
            generalBackgroundElement.style.backgroundColor = generalBackgroundColor;
            generalBackgroundElement.style.display = 'block';
        } else {
            generalBackgroundElement.style.display = 'none';
        }
    }

    ensureResizeHandles(textElement);
}

function initResizeHandles() {
    const handles = document.querySelectorAll('.resize-handle');
    handles.forEach(handle => {
        handle.style.width = '50px';
        handle.style.height = '50px';
        handle.style.backgroundColor = 'white';
        handle.style.border = '2px solid black';
        handle.style.zIndex = '100';
        handle.style.position = 'absolute';
        handle.addEventListener('mousedown', startResize);
    });

    const topLeftHandle = document.querySelector('.resize-handle.top-left');
    const topRightHandle = document.querySelector('.resize-handle.top-right');
    const bottomLeftHandle = document.querySelector('.resize-handle.bottom-left');
    const bottomRightHandle = document.querySelector('.resize-handle.bottom-right');

    if (topLeftHandle) topLeftHandle.style.transform = 'translate(-50%, -50%)';
    if (topRightHandle) topRightHandle.style.transform = 'translate(50%, -50%)';
    if (bottomLeftHandle) bottomLeftHandle.style.transform = 'translate(-50%, 50%)';
    if (bottomRightHandle) bottomRightHandle.style.transform = 'translate(50%, 50%)';
}

function startDragging(e) {
    if (e.target.classList.contains('resize-handle')) return;

    const text = e.target.closest('.thumbnail-text');
    if (!text) return;

    const preview = text.parentElement;

    const startX = e.clientX - text.offsetLeft;
    const startY = e.clientY - text.offsetTop;

    function drag(e) {
        const newLeft = e.clientX - startX;
        const newTop = e.clientY - startY;

        const maxX = preview.offsetWidth - text.offsetWidth;
        const maxY = preview.offsetHeight - text.offsetHeight;

        text.style.left = `${Math.max(0, Math.min(newLeft, maxX))}px`;
        text.style.top = `${Math.max(0, Math.min(newTop, maxY))}px`;
    }

    function stopDragging() {
        document.removeEventListener('mousemove', drag);
        document.removeEventListener('mouseup', stopDragging);
    }

    document.addEventListener('mousemove', drag);
    document.addEventListener('mouseup', stopDragging);
}

function startResize(e) {
    e.stopPropagation();
    const handle = e.target;
    const text = handle.closest('.thumbnail-text');
    const preview = text.parentElement;
    const scale = parseFloat(preview.style.transform.match(/scale\((.*?)\)/)?.[1] || 1);

    const startX = e.clientX;
    const startY = e.clientY;
    const startWidth = text.offsetWidth;
    const startHeight = text.offsetHeight;
    const startLeft = text.offsetLeft;
    const startTop = text.offsetTop;

    function resize(e) {
        const dx = (e.clientX - startX) / scale;
        const dy = (e.clientY - startY) / scale;

        let newWidth, newHeight, newLeft, newTop;

        const scaledDx = dx * 1.5;
        const scaledDy = dy * 1.5;

        if (handle.classList.contains('top-left') || handle.classList.contains('bottom-left')) {
            newWidth = startWidth - scaledDx;
            newLeft = startLeft + scaledDx;
        } else {
            newWidth = startWidth + scaledDx;
            newLeft = startLeft;
        }

        if (handle.classList.contains('top-left') || handle.classList.contains('top-right')) {
            newHeight = startHeight - scaledDy;
            newTop = startTop + scaledDy;
        } else {
            newHeight = startHeight + scaledDy;
            newTop = startTop;
        }

        const maxWidth = preview.offsetWidth - newLeft;
        const maxHeight = preview.offsetHeight - newTop;

        text.style.width = `${Math.max(20, Math.min(newWidth, maxWidth))}px`;
        text.style.height = `${Math.max(20, Math.min(newHeight, maxHeight))}px`;
        text.style.left = `${Math.max(0, newLeft)}px`;
        text.style.top = `${Math.max(0, newTop)}px`;
    }

    function stopResize() {
        document.removeEventListener('mousemove', resize);
        document.removeEventListener('mouseup', stopResize);
    }

    document.addEventListener('mousemove', resize);
    document.addEventListener('mouseup', stopResize);
}

window.initTextControls = initTextControls;