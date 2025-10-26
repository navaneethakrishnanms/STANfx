// NEW MASK METHODS - Add these to editor.js after the clearMask method

// Load mask/overlay image
loadMaskImage(e) {
    const file = e.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = (event) => {
        const img = new Image();
        img.onload = () => {
            this.maskImage = img;
            // Set initial size based on image aspect ratio
            const aspectRatio = img.width / img.height;
            if (aspectRatio > 1) {
                this.maskSize.width = 300;
                this.maskSize.height = 300 / aspectRatio;
            } else {
                this.maskSize.height = 300;
                this.maskSize.width = 300 * aspectRatio;
            }
            // Center the mask
            this.maskPosition.x = (this.canvas.width - this.maskSize.width) / 2;
            this.maskPosition.y = (this.canvas.height - this.maskSize.height) / 2;
            
            // Show preview and buttons
            document.getElementById('maskImagePreview').style.display = 'block';
            document.getElementById('maskPreviewImg').src = event.target.result;
            document.getElementById('applyMask').style.display = 'block';
            document.getElementById('removeMask').style.display = 'block';
            
            this.redrawWithMask();
        };
        img.src = event.target.result;
    };
    reader.readAsDataURL(file);
}

// Check if point is inside mask image
isPointInMask(x, y) {
    return x >= this.maskPosition.x && 
           x <= this.maskPosition.x + this.maskSize.width &&
           y >= this.maskPosition.y && 
           y <= this.maskPosition.y + this.maskSize.height;
}

// Get resize handle at position
getMaskResizeHandle(x, y) {
    if (!this.maskImage) return null;
    
    const handleSize = 15;
    const mx = this.maskPosition.x;
    const my = this.maskPosition.y;
    const mw = this.maskSize.width;
    const mh = this.maskSize.height;
    
    const handles = {
        'tl': { x: mx, y: my },
        'tr': { x: mx + mw, y: my },
        'bl': { x: mx, y: my + mh },
        'br': { x: mx + mw, y: my + mh }
    };
    
    for (let [key, pos] of Object.entries(handles)) {
        if (Math.abs(x - pos.x) < handleSize && Math.abs(y - pos.y) < handleSize) {
            return key;
        }
    }
    return null;
}

// Resize mask image
resizeMaskImage(x, y) {
    if (!this.resizeHandle) return;
    
    const handle = this.resizeHandle;
    const startX = this.maskPosition.x;
    const startY = this.maskPosition.y;
    const endX = this.maskPosition.x + this.maskSize.width;
    const endY = this.maskPosition.y + this.maskSize.height;
    
    if (handle === 'br') {
        // Bottom-right: expand/contract from top-left
        this.maskSize.width = Math.max(50, x - startX);
        this.maskSize.height = Math.max(50, y - startY);
    } else if (handle === 'bl') {
        // Bottom-left: move left edge, expand/contract bottom
        const newX = Math.min(x, endX - 50);
        this.maskSize.width = endX - newX;
        this.maskPosition.x = newX;
        this.maskSize.height = Math.max(50, y - startY);
    } else if (handle === 'tr') {
        // Top-right: move top edge, expand/contract right
        const newY = Math.min(y, endY - 50);
        this.maskSize.height = endY - newY;
        this.maskPosition.y = newY;
        this.maskSize.width = Math.max(50, x - startX);
    } else if (handle === 'tl') {
        // Top-left: move both edges
        const newX = Math.min(x, endX - 50);
        const newY = Math.min(y, endY - 50);
        this.maskSize.width = endX - newX;
        this.maskSize.height = endY - newY;
        this.maskPosition.x = newX;
        this.maskPosition.y = newY;
    }
}

// Redraw canvas with mask overlay
redrawWithMask() {
    if (!this.maskImage) return;
    
    // Redraw base image
    this.ctx.putImageData(this.currentImage, 0, 0);
    this.redrawShapes();
    this.redrawTextElements();
    
    // Draw mask image with opacity
    this.ctx.globalAlpha = this.maskOpacity;
    this.ctx.drawImage(
        this.maskImage,
        this.maskPosition.x,
        this.maskPosition.y,
        this.maskSize.width,
        this.maskSize.height
    );
    this.ctx.globalAlpha = 1.0;
    
    // Draw resize handles
    this.drawMaskHandles();
}

// Draw resize handles for mask
drawMaskHandles() {
    const handleSize = 12;
    const mx = this.maskPosition.x;
    const my = this.maskPosition.y;
    const mw = this.maskSize.width;
    const mh = this.maskSize.height;
    
    // Draw border
    this.ctx.strokeStyle = '#00ff00';
    this.ctx.lineWidth = 2;
    this.ctx.strokeRect(mx, my, mw, mh);
    
    // Draw corner handles
    this.ctx.fillStyle = '#00ff00';
    const corners = [
        { x: mx, y: my },                    // top-left
        { x: mx + mw, y: my },              // top-right
        { x: mx, y: my + mh },              // bottom-left
        { x: mx + mw, y: my + mh }          // bottom-right
    ];
    
    corners.forEach(corner => {
        this.ctx.fillRect(
            corner.x - handleSize / 2,
            corner.y - handleSize / 2,
            handleSize,
            handleSize
        );
    });
}

// Apply mask to image permanently
applyMask() {
    if (!this.maskImage) {
        alert('Please upload a mask image first');
        return;
    }
    
    // Draw everything to canvas
    this.ctx.putImageData(this.currentImage, 0, 0);
    this.redrawShapes();
    this.redrawTextElements();
    
    // Draw mask image
    this.ctx.globalAlpha = this.maskOpacity;
    this.ctx.drawImage(
        this.maskImage,
        this.maskPosition.x,
        this.maskPosition.y,
        this.maskSize.width,
        this.maskSize.height
    );
    this.ctx.globalAlpha = 1.0;
    
    // Save as current image
    this.currentImage = this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height);
    
    // Reset mask
    this.removeMask();
    this.saveHistory();
    alert('Mask applied successfully!');
}

// Remove mask overlay
removeMask() {
    this.maskImage = null;
    this.maskPosition = { x: 50, y: 50 };
    this.maskSize = { width: 200, height: 200 };
    this.maskOpacity = 1.0;
    
    // Hide UI elements
    document.getElementById('maskImagePreview').style.display = 'none';
    document.getElementById('applyMask').style.display = 'none';
    document.getElementById('removeMask').style.display = 'none';
    document.getElementById('maskImageUpload').value = '';
    document.getElementById('maskOpacity').value = 100;
    document.getElementById('maskOpacityValue').textContent = '100%';
    
    // Redraw without mask
    this.ctx.putImageData(this.currentImage, 0, 0);
    this.redrawShapes();
    this.redrawTextElements();
}
