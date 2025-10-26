// COMPLETE FIXED editor.js - All bugs fixed + Mask + Collage
class ImageEditor {
    constructor() {
        this.canvas = document.getElementById('mainCanvas');
        this.ctx = this.canvas.getContext('2d', { willReadFrequently: true });
        this.drawingCanvas = document.getElementById('drawingCanvas');
        this.drawCtx = this.drawingCanvas.getContext('2d');
        
        this.currentTool = 'crop';
        this.originalImage = null;
        this.currentImage = null;
        this.history = [];
        this.historyStep = -1;
        
        this.cropStart = null;
        this.cropEnd = null;
        this.isCropping = false;
        this.isDraggingCropHandle = false;
        this.activeCropHandle = null;
        
        this.isDrawing = false;
        this.lastX = 0;
        this.lastY = 0;
        
        // FIXED: Shape handling
        this.shapes = [];
        this.isDrawingShape = false;
        this.shapeStart = null;
        this.shapeEnd = null;
        this.selectedShape = null;
        this.isDraggingShape = false;
        this.shapeDragOffset = { x: 0, y: 0 };
        
        this.textElements = [];
        this.selectedText = null;
        this.isDraggingText = false;
        this.dragOffsetX = 0;
        this.dragOffsetY = 0;
        
        this.isPreviewingFilters = false;
        this.baseImageForFilters = null;
        
        // NEW: Mask feature (overlay image)
        this.maskImage = null;
        this.maskPosition = { x: 50, y: 50 };
        this.maskSize = { width: 200, height: 200 };
        this.isDraggingMask = false;
        this.isResizingMask = false;
        this.maskDragOffset = { x: 0, y: 0 };
        this.resizeHandle = null;
        this.maskOpacity = 1.0;
        
        // NEW: Collage feature
        this.collageImages = [];
        this.collageLayout = 'grid';
        
        this.init();
    }
    
    init() {
        const imageData = sessionStorage.getItem('imageToEdit');
        if (!imageData) {
            alert('No image to edit. Please upload an image first.');
            window.location.href = '/upload';
            return;
        }
        this.loadImage(imageData);
        this.setupEventListeners();
    }
    
    loadImage(imageData) {
        const img = new Image();
        img.onload = () => {
            this.originalImage = img;
            this.canvas.width = img.width;
            this.canvas.height = img.height;
            this.drawingCanvas.width = img.width;
            this.drawingCanvas.height = img.height;
            this.ctx.drawImage(img, 0, 0);
            this.currentImage = this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height);
            this.saveHistory();
        };
        img.src = imageData;
    }
    
    setupEventListeners() {
        document.querySelectorAll('.tool-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                document.querySelectorAll('.tool-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                this.currentTool = btn.dataset.tool;
                this.showToolOptions(this.currentTool);
            });
        });
        
        document.getElementById('saveBtn').addEventListener('click', () => this.saveToGallery());
        document.getElementById('undoBtn').addEventListener('click', () => this.undo());
        document.getElementById('redoBtn').addEventListener('click', () => this.redo());
        
        this.canvas.addEventListener('mousedown', (e) => this.handleMouseDown(e));
        this.canvas.addEventListener('mousemove', (e) => this.handleMouseMove(e));
        this.canvas.addEventListener('mouseup', (e) => this.handleMouseUp(e));
        
        document.getElementById('applyCrop').addEventListener('click', () => this.applyCrop());
        document.getElementById('cancelCrop').addEventListener('click', () => this.cancelCrop());
        
        document.getElementById('flipHorizontal').addEventListener('click', () => this.flipImage('horizontal'));
        document.getElementById('flipVertical').addEventListener('click', () => this.flipImage('vertical'));
        
        document.getElementById('rotateLeft').addEventListener('click', () => this.rotateImage(-90));
        document.getElementById('rotateRight').addEventListener('click', () => this.rotateImage(90));
        document.getElementById('rotateSlider').addEventListener('input', (e) => {
            document.getElementById('rotateValue').textContent = e.target.value + '°';
        });
        document.getElementById('applyRotate').addEventListener('click', () => {
            const angle = parseInt(document.getElementById('rotateSlider').value);
            this.rotateImage(angle);
        });
        
        document.getElementById('brushSize').addEventListener('input', (e) => {
            document.getElementById('brushSizeValue').textContent = e.target.value;
        });
        document.getElementById('clearDrawing').addEventListener('click', () => this.clearDrawing());
        
        this.drawingCanvas.addEventListener('mousedown', (e) => this.startDrawing(e));
        this.drawingCanvas.addEventListener('mousemove', (e) => this.draw(e));
        this.drawingCanvas.addEventListener('mouseup', () => this.stopDrawing());
        this.drawingCanvas.addEventListener('mouseout', () => this.stopDrawing());
        
        document.getElementById('fontSize').addEventListener('input', (e) => {
            document.getElementById('fontSizeValue').textContent = e.target.value;
        });
        document.getElementById('addText').addEventListener('click', () => this.addText());
        
        document.getElementById('shapeStrokeWidth').addEventListener('input', (e) => {
            document.getElementById('shapeStrokeValue').textContent = e.target.value;
        });
        
        document.getElementById('brightness').addEventListener('input', (e) => {
            document.getElementById('brightnessValue').textContent = e.target.value;
            this.applyFiltersRealtime();
        });
        document.getElementById('contrast').addEventListener('input', (e) => {
            document.getElementById('contrastValue').textContent = e.target.value;
            this.applyFiltersRealtime();
        });
        document.getElementById('saturation').addEventListener('input', (e) => {
            document.getElementById('saturationValue').textContent = e.target.value;
            this.applyFiltersRealtime();
        });
        document.getElementById('blur').addEventListener('input', (e) => {
            document.getElementById('blurValue').textContent = e.target.value;
            this.applyFiltersRealtime();
        });
        document.getElementById('noise').addEventListener('input', (e) => {
            document.getElementById('noiseValue').textContent = e.target.value;
            this.applyFiltersRealtime();
        });
        
        document.getElementById('applyFilters').addEventListener('click', () => this.applyFilters());
        document.getElementById('resetFilters').addEventListener('click', () => this.resetFilters());
        
        const quickFilterBtns = document.querySelectorAll('.btn-filter');
        if (quickFilterBtns.length > 0) {
            quickFilterBtns.forEach(btn => {
                btn.addEventListener('click', (e) => {
                    const filter = e.target.dataset.filter;
                    this.applyQuickFilter(filter);
                });
            });
        }
        
        // NEW: Mask listeners
        const maskUpload = document.getElementById('maskImageUpload');
        if(maskUpload) maskUpload.addEventListener('change', (e) => this.loadMaskImage(e));
        const maskOpacity = document.getElementById('maskOpacity');
        if(maskOpacity) {
            maskOpacity.addEventListener('input', (e) => {
                document.getElementById('maskOpacityValue').textContent = e.target.value + '%';
                this.maskOpacity = e.target.value / 100;
                if(this.maskImage) this.redrawWithMask();
            });
        }
        const applyMask = document.getElementById('applyMask');
        if(applyMask) applyMask.addEventListener('click', () => this.applyMask());
        const removeMask = document.getElementById('removeMask');
        if(removeMask) removeMask.addEventListener('click', () => this.removeMask());
        
        // NEW: Collage listeners
        document.querySelectorAll('.collage-layout-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                document.querySelectorAll('.collage-layout-btn').forEach(b => b.classList.remove('selected'));
                btn.classList.add('selected');
                this.collageLayout = btn.dataset.layout;
            });
        });
        const c1 = document.getElementById('collageImage1');
        if(c1) c1.addEventListener('change', (e) => this.loadCollageImage(e, 0));
        const c2 = document.getElementById('collageImage2');
        if(c2) c2.addEventListener('change', (e) => this.loadCollageImage(e, 1));
        const c3 = document.getElementById('collageImage3');
        if(c3) c3.addEventListener('change', (e) => this.loadCollageImage(e, 2));
        const c4 = document.getElementById('collageImage4');
        if(c4) c4.addEventListener('change', (e) => this.loadCollageImage(e, 3));
        const createCollage = document.getElementById('createCollage');
        if(createCollage) createCollage.addEventListener('click', () => this.createCollage());
    }
    
    showToolOptions(tool) {
        document.querySelectorAll('.tool-options').forEach(opt => opt.style.display = 'none');
        const optionsId = tool + 'Options';
        const optionsEl = document.getElementById(optionsId);
        if (optionsEl) optionsEl.style.display = 'block';
        
        this.drawingCanvas.classList.remove('active');
        if (tool === 'draw' || tool === 'shape') {
            this.drawingCanvas.classList.add('active');
        }
        if (tool !== 'filter' && this.isPreviewingFilters) {
            this.cancelFilterPreview();
        }
    }
    
    getMousePos(e, canvas) {
        const rect = canvas.getBoundingClientRect();
        const scaleX = canvas.width / rect.width;
        const scaleY = canvas.height / rect.height;
        return {
            x: (e.clientX - rect.left) * scaleX,
            y: (e.clientY - rect.top) * scaleY
        };
    }
    
    getCropHandle(x, y) {
        if (!this.cropStart || !this.cropEnd) return null;
        const handleSize = 12;
        const cropX = Math.min(this.cropStart.x, this.cropEnd.x);
        const cropY = Math.min(this.cropStart.y, this.cropEnd.y);
        const cropW = Math.abs(this.cropEnd.x - this.cropStart.x);
        const cropH = Math.abs(this.cropEnd.y - this.cropStart.y);
        const handles = {
            'tl': { x: cropX, y: cropY },
            'tr': { x: cropX + cropW, y: cropY },
            'bl': { x: cropX, y: cropY + cropH },
            'br': { x: cropX + cropW, y: cropY + cropH },
            'tm': { x: cropX + cropW/2, y: cropY },
            'bm': { x: cropX + cropW/2, y: cropY + cropH },
            'ml': { x: cropX, y: cropY + cropH/2 },
            'mr': { x: cropX + cropW, y: cropY + cropH/2 }
        };
        for (let [key, pos] of Object.entries(handles)) {
            if (Math.abs(x - pos.x) < handleSize && Math.abs(y - pos.y) < handleSize) {
                return key;
            }
        }
        return null;
    }
    
    handleMouseDown(e) {
        const pos = this.getMousePos(e, this.canvas);
        
        if (this.currentTool === 'mask' && this.maskImage) {
            // Check if clicking on resize handle
            const handle = this.getMaskResizeHandle(pos.x, pos.y);
            if (handle) {
                this.isResizingMask = true;
                this.resizeHandle = handle;
                return;
            }
            // Check if clicking inside mask image
            if (this.isPointInMask(pos.x, pos.y)) {
                this.isDraggingMask = true;
                this.maskDragOffset = {
                    x: pos.x - this.maskPosition.x,
                    y: pos.y - this.maskPosition.y
                };
                return;
            }
        }
        
        if (this.currentTool === 'crop') {
            const handle = this.getCropHandle(pos.x, pos.y);
            if (handle) {
                this.isDraggingCropHandle = true;
                this.activeCropHandle = handle;
            } else {
                this.isCropping = true;
                this.cropStart = pos;
                this.cropEnd = pos;
            }
        } else if (this.currentTool === 'text') {
            this.selectedText = null;
            for (let i = this.textElements.length - 1; i >= 0; i--) {
                const txt = this.textElements[i];
                const metrics = this.ctx.measureText(txt.text);
                const textHeight = parseInt(txt.fontSize);
                
                if (pos.x >= txt.x && pos.x <= txt.x + metrics.width && 
                    pos.y >= txt.y - textHeight && pos.y <= txt.y) {
                    this.selectedText = txt;
                    this.isDraggingText = true;
                    this.dragOffsetX = pos.x - txt.x;
                    this.dragOffsetY = pos.y - txt.y;
                    break;
                }
            }
        } else if (this.currentTool === 'shape') {
            this.selectedShape = null;
            for (let i = this.shapes.length - 1; i >= 0; i--) {
                if (this.isPointInShape(pos.x, pos.y, this.shapes[i])) {
                    this.selectedShape = this.shapes[i];
                    this.isDraggingShape = true;
                    this.shapeDragOffset = {
                        x: pos.x - this.shapes[i].x,
                        y: pos.y - this.shapes[i].y
                    };
                    break;
                }
            }
        }
    }
    
    handleMouseMove(e) {
        const pos = this.getMousePos(e, this.canvas);
        
        if (this.currentTool === 'mask' && this.maskImage) {
            if (this.isDraggingMask) {
                this.maskPosition.x = pos.x - this.maskDragOffset.x;
                this.maskPosition.y = pos.y - this.maskDragOffset.y;
                this.redrawWithMask();
                return;
            } else if (this.isResizingMask) {
                this.resizeMaskImage(pos.x, pos.y);
                this.redrawWithMask();
                return;
            } else {
                // Update cursor based on position
                const handle = this.getMaskResizeHandle(pos.x, pos.y);
                if (handle) {
                    if (handle === 'tl' || handle === 'br') this.canvas.style.cursor = 'nwse-resize';
                    else if (handle === 'tr' || handle === 'bl') this.canvas.style.cursor = 'nesw-resize';
                } else if (this.isPointInMask(pos.x, pos.y)) {
                    this.canvas.style.cursor = 'move';
                } else {
                    this.canvas.style.cursor = 'default';
                }
                return;
            }
        }
        
        if (this.currentTool === 'crop') {
            if (this.isDraggingCropHandle) {
                this.resizeCrop(pos.x, pos.y);
                this.drawCropSelection();
            } else if (this.isCropping) {
                this.cropEnd = pos;
                this.drawCropSelection();
            } else {
                const handle = this.getCropHandle(pos.x, pos.y);
                this.canvas.style.cursor = handle ? 'pointer' : 'crosshair';
            }
        } else if (this.isDraggingText && this.selectedText) {
            this.selectedText.x = pos.x - this.dragOffsetX;
            this.selectedText.y = pos.y - this.dragOffsetY;
            this.redrawWithText();
        } else if (this.isDraggingShape && this.selectedShape) {
            // FIXED: Properly move shape
            const deltaX = pos.x - this.shapeDragOffset.x - this.selectedShape.x;
            const deltaY = pos.y - this.shapeDragOffset.y - this.selectedShape.y;
            this.selectedShape.x = pos.x - this.shapeDragOffset.x;
            this.selectedShape.y = pos.y - this.shapeDragOffset.y;
            this.selectedShape.endX += deltaX;
            this.selectedShape.endY += deltaY;
            this.redrawWithShapes();
        }
    }
    
    handleMouseUp(e) {
        if (this.currentTool === 'mask') {
            this.isDraggingMask = false;
            this.isResizingMask = false;
            this.resizeHandle = null;
        } else if (this.currentTool === 'crop') {
            this.isCropping = false;
            this.isDraggingCropHandle = false;
            this.activeCropHandle = null;
        } else if (this.currentTool === 'text' && this.isDraggingText) {
            this.isDraggingText = false;
        } else if (this.currentTool === 'shape' && this.isDraggingShape) {
            this.isDraggingShape = false;
        }
    }
    
    resizeCrop(x, y) {
        if (!this.activeCropHandle) return;
        const handle = this.activeCropHandle;
        let newStart = {...this.cropStart};
        let newEnd = {...this.cropEnd};
        if (handle.includes('l')) newStart.x = x;
        if (handle.includes('r')) newEnd.x = x;
        if (handle.includes('t')) newStart.y = y;
        if (handle.includes('b')) newEnd.y = y;
        this.cropStart = newStart;
        this.cropEnd = newEnd;
    }
    
    drawCropSelection() {
        this.ctx.putImageData(this.currentImage, 0, 0);
        this.redrawTextElements();
        this.redrawShapes();
        
        const x = Math.min(this.cropStart.x, this.cropEnd.x);
        const y = Math.min(this.cropStart.y, this.cropEnd.y);
        const width = Math.abs(this.cropEnd.x - this.cropStart.x);
        const height = Math.abs(this.cropEnd.y - this.cropStart.y);
        
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        this.ctx.clearRect(x, y, width, height);
        
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = this.canvas.width;
        tempCanvas.height = this.canvas.height;
        const tempCtx = tempCanvas.getContext('2d');
        tempCtx.putImageData(this.currentImage, 0, 0);
        this.ctx.drawImage(tempCanvas, x, y, width, height, x, y, width, height);
        
        this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
        this.ctx.lineWidth = 1;
        for (let i = 1; i < 3; i++) {
            this.ctx.beginPath();
            this.ctx.moveTo(x + (width / 3) * i, y);
            this.ctx.lineTo(x + (width / 3) * i, y + height);
            this.ctx.stroke();
            this.ctx.beginPath();
            this.ctx.moveTo(x, y + (height / 3) * i);
            this.ctx.lineTo(x + width, y + (height / 3) * i);
            this.ctx.stroke();
        }
        
        this.ctx.strokeStyle = '#00ff00';
        this.ctx.lineWidth = 2;
        this.ctx.strokeRect(x, y, width, height);
        
        const handleSize = 10;
        this.ctx.fillStyle = '#00ff00';
        const handles = [
            {x: x, y: y}, {x: x + width, y: y},
            {x: x, y: y + height}, {x: x + width, y: y + height},
            {x: x + width/2, y: y}, {x: x + width/2, y: y + height},
            {x: x, y: y + height/2}, {x: x + width, y: y + height/2}
        ];
        handles.forEach(h => {
            this.ctx.fillRect(h.x - handleSize/2, h.y - handleSize/2, handleSize, handleSize);
        });
    }
    
    applyCrop() {
        if (!this.cropStart || !this.cropEnd) {
            alert('Please select an area to crop');
            return;
        }
        const x = Math.max(0, Math.min(this.cropStart.x, this.cropEnd.x));
        const y = Math.max(0, Math.min(this.cropStart.y, this.cropEnd.y));
        const width = Math.min(this.canvas.width - x, Math.abs(this.cropEnd.x - this.cropStart.x));
        const height = Math.min(this.canvas.height - y, Math.abs(this.cropEnd.y - this.cropStart.y));
        if (width < 10 || height < 10) {
            alert('Crop area is too small');
            return;
        }
        this.ctx.putImageData(this.currentImage, 0, 0);
        const croppedData = this.ctx.getImageData(x, y, width, height);
        this.canvas.width = width;
        this.canvas.height = height;
        this.drawingCanvas.width = width;
        this.drawingCanvas.height = height;
        this.ctx.putImageData(croppedData, 0, 0);
        this.currentImage = this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height);
        this.textElements.forEach(txt => {
            txt.x -= x;
            txt.y -= y;
        });
        this.textElements = this.textElements.filter(txt => 
            txt.x >= 0 && txt.y >= 0 && txt.x < width && txt.y < height
        );
        this.shapes.forEach(shape => {
            shape.x -= x;
            shape.y -= y;
            shape.endX -= x;
            shape.endY -= y;
        });
        this.shapes = this.shapes.filter(shape => 
            shape.x >= 0 && shape.y >= 0 && shape.x < width && shape.y < height
        );
        this.cropStart = null;
        this.cropEnd = null;
        this.canvas.style.cursor = 'default';
        this.redrawWithText();
        this.saveHistory();
    }
    
    cancelCrop() {
        this.cropStart = null;
        this.cropEnd = null;
        this.canvas.style.cursor = 'default';
        this.ctx.putImageData(this.currentImage, 0, 0);
        this.redrawTextElements();
        this.redrawShapes();
    }
    
    flipImage(direction) {
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = this.canvas.width;
        tempCanvas.height = this.canvas.height;
        const tempCtx = tempCanvas.getContext('2d');
        this.ctx.putImageData(this.currentImage, 0, 0);
        tempCtx.save();
        if (direction === 'horizontal') {
            tempCtx.scale(-1, 1);
            tempCtx.drawImage(this.canvas, -this.canvas.width, 0);
        } else {
            tempCtx.scale(1, -1);
            tempCtx.drawImage(this.canvas, 0, -this.canvas.height);
        }
        tempCtx.restore();
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        this.ctx.drawImage(tempCanvas, 0, 0);
        this.currentImage = this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height);
        this.saveHistory();
    }
    
    rotateImage(angle) {
        const tempCanvas = document.createElement('canvas');
        const rad = (angle * Math.PI) / 180;
        this.ctx.putImageData(this.currentImage, 0, 0);
        if (angle === 90 || angle === -90 || angle === 270 || angle === -270) {
            tempCanvas.width = this.canvas.height;
            tempCanvas.height = this.canvas.width;
        } else {
            const newWidth = Math.abs(this.canvas.width * Math.cos(rad)) + Math.abs(this.canvas.height * Math.sin(rad));
            const newHeight = Math.abs(this.canvas.width * Math.sin(rad)) + Math.abs(this.canvas.height * Math.cos(rad));
            tempCanvas.width = newWidth;
            tempCanvas.height = newHeight;
        }
        const tempCtx = tempCanvas.getContext('2d');
        tempCtx.save();
        tempCtx.translate(tempCanvas.width / 2, tempCanvas.height / 2);
        tempCtx.rotate(rad);
        tempCtx.drawImage(this.canvas, -this.canvas.width / 2, -this.canvas.height / 2);
        tempCtx.restore();
        this.canvas.width = tempCanvas.width;
        this.canvas.height = tempCanvas.height;
        this.drawingCanvas.width = tempCanvas.width;
        this.drawingCanvas.height = tempCanvas.height;
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        this.ctx.drawImage(tempCanvas, 0, 0);
        this.currentImage = this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height);
        this.saveHistory();
    }
    
    startDrawing(e) {
        const pos = this.getMousePos(e, this.drawingCanvas);
        if (this.currentTool === 'draw') {
            this.isDrawing = true;
            this.lastX = pos.x;
            this.lastY = pos.y;
        } else if (this.currentTool === 'shape' && !this.isDraggingShape) {
            this.isDrawingShape = true;
            this.shapeStart = pos;
            this.shapeEnd = pos;
        }
    }
    
    draw(e) {
        const pos = this.getMousePos(e, this.drawingCanvas);
        if (this.currentTool === 'draw' && this.isDrawing) {
            const brushSize = document.getElementById('brushSize').value;
            const color = document.getElementById('drawColor').value;
            this.drawCtx.strokeStyle = color;
            this.drawCtx.lineWidth = brushSize;
            this.drawCtx.lineCap = 'round';
            this.drawCtx.lineJoin = 'round';
            this.drawCtx.beginPath();
            this.drawCtx.moveTo(this.lastX, this.lastY);
            this.drawCtx.lineTo(pos.x, pos.y);
            this.drawCtx.stroke();
            this.lastX = pos.x;
            this.lastY = pos.y;
        } else if (this.currentTool === 'shape' && this.isDrawingShape) {
            this.shapeEnd = pos;
            this.drawCtx.clearRect(0, 0, this.drawingCanvas.width, this.drawingCanvas.height);
            this.drawShapePreview(this.shapeStart.x, this.shapeStart.y, this.shapeEnd.x, this.shapeEnd.y);
        }
    }
    
    drawShapePreview(startX, startY, endX, endY) {
        const shapeType = document.getElementById('shapeType').value;
        const fillColor = document.getElementById('shapeFillColor').value;
        const strokeColor = document.getElementById('shapeStrokeColor').value;
        const strokeWidth = document.getElementById('shapeStrokeWidth').value;
        const filled = document.getElementById('shapeFilled').checked;
        this.drawCtx.strokeStyle = strokeColor;
        this.drawCtx.fillStyle = fillColor;
        this.drawCtx.lineWidth = parseInt(strokeWidth);
        if (shapeType === 'rectangle') {
            const width = endX - startX;
            const height = endY - startY;
            if (filled) this.drawCtx.fillRect(startX, startY, width, height);
            this.drawCtx.strokeRect(startX, startY, width, height);
        } else if (shapeType === 'circle') {
            const radius = Math.sqrt(Math.pow(endX - startX, 2) + Math.pow(endY - startY, 2));
            this.drawCtx.beginPath();
            this.drawCtx.arc(startX, startY, radius, 0, 2 * Math.PI);
            if (filled) this.drawCtx.fill();
            this.drawCtx.stroke();
        } else if (shapeType === 'line') {
            this.drawCtx.beginPath();
            this.drawCtx.moveTo(startX, startY);
            this.drawCtx.lineTo(endX, endY);
            this.drawCtx.stroke();
        }
    }
    
    stopDrawing() {
        if (this.currentTool === 'draw' && this.isDrawing) {
            this.isDrawing = false;
            this.mergeDrawingToCanvas();
        } else if (this.currentTool === 'shape' && this.isDrawingShape) {
            this.isDrawingShape = false;
            this.saveCurrentShape();
            this.drawCtx.clearRect(0, 0, this.drawingCanvas.width, this.drawingCanvas.height);
        }
    }
    
    saveCurrentShape() {
        if (!this.shapeStart || !this.shapeEnd) return;
        const shapeType = document.getElementById('shapeType').value;
        const fillColor = document.getElementById('shapeFillColor').value;
        const strokeColor = document.getElementById('shapeStrokeColor').value;
        const strokeWidth = document.getElementById('shapeStrokeWidth').value;
        const filled = document.getElementById('shapeFilled').checked;
        const shape = {
            type: shapeType,
            x: this.shapeStart.x,
            y: this.shapeStart.y,
            endX: this.shapeEnd.x,
            endY: this.shapeEnd.y,
            fillColor: fillColor,
            strokeColor: strokeColor,
            strokeWidth: parseInt(strokeWidth),
            filled: filled
        };
        this.shapes.push(shape);
        this.shapeStart = null;
        this.shapeEnd = null;
        this.redrawWithShapes();
    }
    
    isPointInShape(x, y, shape) {
        if (shape.type === 'rectangle') {
            const minX = Math.min(shape.x, shape.endX);
            const maxX = Math.max(shape.x, shape.endX);
            const minY = Math.min(shape.y, shape.endY);
            const maxY = Math.max(shape.y, shape.endY);
            return x >= minX && x <= maxX && y >= minY && y <= maxY;
        } else if (shape.type === 'circle') {
            const radius = Math.sqrt(Math.pow(shape.endX - shape.x, 2) + Math.pow(shape.endY - shape.y, 2));
            const dist = Math.sqrt(Math.pow(x - shape.x, 2) + Math.pow(y - shape.y, 2));
            return dist <= radius;
        } else if (shape.type === 'line') {
            const dist = this.distanceToLine(x, y, shape.x, shape.y, shape.endX, shape.endY);
            return dist < 10;
        }
        return false;
    }
    
    distanceToLine(px, py, x1, y1, x2, y2) {
        const A = px - x1;
        const B = py - y1;
        const C = x2 - x1;
        const D = y2 - y1;
        const dot = A * C + B * D;
        const lenSq = C * C + D * D;
        let param = -1;
        if (lenSq !== 0) param = dot / lenSq;
        let xx, yy;
        if (param < 0) {
            xx = x1;
            yy = y1;
        } else if (param > 1) {
            xx = x2;
            yy = y2;
        } else {
            xx = x1 + param * C;
            yy = y1 + param * D;
        }
        const dx = px - xx;
        const dy = py - yy;
        return Math.sqrt(dx * dx + dy * dy);
    }
    
    redrawShapes() {
        this.shapes.forEach(shape => {
            this.ctx.strokeStyle = shape.strokeColor;
            this.ctx.fillStyle = shape.fillColor;
            this.ctx.lineWidth = shape.strokeWidth;
            if (shape.type === 'rectangle') {
                const width = shape.endX - shape.x;
                const height = shape.endY - shape.y;
                if (shape.filled) this.ctx.fillRect(shape.x, shape.y, width, height);
                this.ctx.strokeRect(shape.x, shape.y, width, height);
            } else if (shape.type === 'circle') {
                const radius = Math.sqrt(Math.pow(shape.endX - shape.x, 2) + Math.pow(shape.endY - shape.y, 2));
                this.ctx.beginPath();
                this.ctx.arc(shape.x, shape.y, radius, 0, 2 * Math.PI);
                if (shape.filled) this.ctx.fill();
                this.ctx.stroke();
            } else if (shape.type === 'line') { 
                this.ctx.beginPath();
                this.ctx.moveTo(shape.x, shape.y);
                this.ctx.lineTo(shape.endX, shape.endY);
                this.ctx.stroke();
            }
        });
    }
    
    redrawWithShapes() {
        this.ctx.putImageData(this.currentImage, 0, 0);
        this.redrawShapes();
        this.redrawTextElements();
    }
    
    mergeDrawingToCanvas() {
        this.ctx.drawImage(this.drawingCanvas, 0, 0);
        this.drawCtx.clearRect(0, 0, this.drawingCanvas.width, this.drawingCanvas.height);
        this.currentImage = this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height);
        this.saveHistory();
    }
    
    clearDrawing() {
        this.drawCtx.clearRect(0, 0, this.drawingCanvas.width, this.drawingCanvas.height);
        this.shapes = [];
        this.redrawWithShapes();
    }
    
    addText() {
        const text = document.getElementById('textInput').value;
        if (!text) {
            alert('Please enter text');
            return;
        }
        const fontSize = document.getElementById('fontSize').value;
        const color = document.getElementById('textColor').value;
        const fontFamily = document.getElementById('fontFamily').value;
        this.ctx.font = `${fontSize}px ${fontFamily}`;
        const textWidth = this.ctx.measureText(text).width;
        const textObj = {
            text: text,
            x: 50,
            y: 50 + parseInt(fontSize),
            fontSize: fontSize,
            color: color,
            fontFamily: fontFamily
        };
        this.textElements.push(textObj);
        this.redrawWithText();
        document.getElementById('textInput').value = '';
    }
    
    redrawTextElements() {
        this.textElements.forEach(txt => {
            this.ctx.font = `${txt.fontSize}px ${txt.fontFamily}`;
            this.ctx.fillStyle = txt.color;
            this.ctx.textBaseline = 'top';
            this.ctx.fillText(txt.text, txt.x, txt.y - parseInt(txt.fontSize));
        });
    }
    
    redrawWithText() {
        this.ctx.putImageData(this.currentImage, 0, 0);
        this.redrawShapes();
        this.redrawTextElements();
    }
    
    applyFiltersRealtime() {
        if (!this.isPreviewingFilters) {
            this.isPreviewingFilters = true;
            this.baseImageForFilters = this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height);
        }
        const brightness = document.getElementById('brightness').value;
        const contrast = document.getElementById('contrast').value;
        const saturation = document.getElementById('saturation').value;
        const blur = document.getElementById('blur').value;
        const noise = document.getElementById('noise').value;
        this.ctx.putImageData(this.baseImageForFilters, 0, 0);
        if (noise > 0) {
            const imageData = this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height);
            const data = imageData.data;
            for (let i = 0; i < data.length; i += 4) {
                const noiseVal = (Math.random() - 0.5) * parseInt(noise);
                data[i] = Math.max(0, Math.min(255, data[i] + noiseVal));
                data[i + 1] = Math.max(0, Math.min(255, data[i + 1] + noiseVal));
                data[i + 2] = Math.max(0, Math.min(255, data[i + 2] + noiseVal));
            }
            this.ctx.putImageData(imageData, 0, 0);
        }
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = this.canvas.width;
        tempCanvas.height = this.canvas.height;
        const tempCtx = tempCanvas.getContext('2d');
        tempCtx.filter = `brightness(${brightness}%) contrast(${contrast}%) saturate(${saturation}%) blur(${blur}px)`;
        tempCtx.drawImage(this.canvas, 0, 0);
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        this.ctx.drawImage(tempCanvas, 0, 0);
        this.redrawShapes();
        this.redrawTextElements();
    }
    
    applyFilters() {
        const brightness = document.getElementById('brightness').value;
        const contrast = document.getElementById('contrast').value;
        const saturation = document.getElementById('saturation').value;
        const blur = document.getElementById('blur').value;
        const noise = document.getElementById('noise').value;
        this.ctx.putImageData(this.currentImage, 0, 0);
        if (noise > 0) {
            const imageData = this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height);
            const data = imageData.data;
            for (let i = 0; i < data.length; i += 4) {
                const noiseVal = (Math.random() - 0.5) * parseInt(noise);
                data[i] = Math.max(0, Math.min(255, data[i] + noiseVal));
                data[i + 1] = Math.max(0, Math.min(255, data[i + 1] + noiseVal));
                data[i + 2] = Math.max(0, Math.min(255, data[i + 2] + noiseVal));
            }
            this.ctx.putImageData(imageData, 0, 0);
        }
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = this.canvas.width;
        tempCanvas.height = this.canvas.height;
        const tempCtx = tempCanvas.getContext('2d');
        tempCtx.filter = `brightness(${brightness}%) contrast(${contrast}%) saturate(${saturation}%) blur(${blur}px)`;
        tempCtx.drawImage(this.canvas, 0, 0);
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        this.ctx.drawImage(tempCanvas, 0, 0);
        this.currentImage = this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height);
        this.isPreviewingFilters = false;
        this.baseImageForFilters = null;
        this.saveHistory();
    }
    
    cancelFilterPreview() {
        if (this.isPreviewingFilters && this.baseImageForFilters) {
            this.ctx.putImageData(this.baseImageForFilters, 0, 0);
            this.redrawShapes();
            this.redrawTextElements();
            this.isPreviewingFilters = false;
            this.baseImageForFilters = null;
        }
    }
    
    resetFilters() {
        document.getElementById('brightness').value = 100;
        document.getElementById('contrast').value = 100;
        document.getElementById('saturation').value = 100;
        document.getElementById('blur').value = 0;
        document.getElementById('noise').value = 0;
        document.getElementById('brightnessValue').textContent = 100;
        document.getElementById('contrastValue').textContent = 100;
        document.getElementById('saturationValue').textContent = 100;
        document.getElementById('blurValue').textContent = 0;
        document.getElementById('noiseValue').textContent = 0;
        this.isPreviewingFilters = false;
        this.baseImageForFilters = null;
        this.ctx.putImageData(this.currentImage, 0, 0);
        this.redrawShapes();
        this.redrawTextElements();
    }
    
    applyQuickFilter(filter) {
        this.ctx.putImageData(this.currentImage, 0, 0);
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = this.canvas.width;
        tempCanvas.height = this.canvas.height;
        const tempCtx = tempCanvas.getContext('2d');
        let filterString = '';
        if (filter === 'grayscale') {
            filterString = 'grayscale(100%)';
        } else if (filter === 'sepia') {
            filterString = 'sepia(100%)';
        } else if (filter === 'invert') {
            filterString = 'invert(100%)';
        }
        tempCtx.filter = filterString;
        tempCtx.drawImage(this.canvas, 0, 0);
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        this.ctx.drawImage(tempCanvas, 0, 0);
        this.currentImage = this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height);
        this.saveHistory();
    }
    
    // NEW: Mask feature methods (Overlay Image)
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
    
    isPointInMask(x, y) {
        return x >= this.maskPosition.x && 
               x <= this.maskPosition.x + this.maskSize.width &&
               y >= this.maskPosition.y && 
               y <= this.maskPosition.y + this.maskSize.height;
    }
    
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
    
    resizeMaskImage(x, y) {
        if (!this.resizeHandle) return;
        
        const handle = this.resizeHandle;
        const startX = this.maskPosition.x;
        const startY = this.maskPosition.y;
        const endX = this.maskPosition.x + this.maskSize.width;
        const endY = this.maskPosition.y + this.maskSize.height;
        
        if (handle === 'br') {
            this.maskSize.width = Math.max(50, x - startX);
            this.maskSize.height = Math.max(50, y - startY);
        } else if (handle === 'bl') {
            const newX = Math.min(x, endX - 50);
            this.maskSize.width = endX - newX;
            this.maskPosition.x = newX;
            this.maskSize.height = Math.max(50, y - startY);
        } else if (handle === 'tr') {
            const newY = Math.min(y, endY - 50);
            this.maskSize.height = endY - newY;
            this.maskPosition.y = newY;
            this.maskSize.width = Math.max(50, x - startX);
        } else if (handle === 'tl') {
            const newX = Math.min(x, endX - 50);
            const newY = Math.min(y, endY - 50);
            this.maskSize.width = endX - newX;
            this.maskSize.height = endY - newY;
            this.maskPosition.x = newX;
            this.maskPosition.y = newY;
        }
    }
    
    redrawWithMask() {
        if (!this.maskImage) return;
        
        this.ctx.putImageData(this.currentImage, 0, 0);
        this.redrawShapes();
        this.redrawTextElements();
        
        this.ctx.globalAlpha = this.maskOpacity;
        this.ctx.drawImage(
            this.maskImage,
            this.maskPosition.x,
            this.maskPosition.y,
            this.maskSize.width,
            this.maskSize.height
        );
        this.ctx.globalAlpha = 1.0;
        
        this.drawMaskHandles();
    }
    
    drawMaskHandles() {
        const handleSize = 12;
        const mx = this.maskPosition.x;
        const my = this.maskPosition.y;
        const mw = this.maskSize.width;
        const mh = this.maskSize.height;
        
        this.ctx.strokeStyle = '#00ff00';
        this.ctx.lineWidth = 2;
        this.ctx.strokeRect(mx, my, mw, mh);
        
        this.ctx.fillStyle = '#00ff00';
        const corners = [
            { x: mx, y: my },
            { x: mx + mw, y: my },
            { x: mx, y: my + mh },
            { x: mx + mw, y: my + mh }
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
    
    applyMask() {
        if (!this.maskImage) {
            alert('Please upload a mask image first');
            return;
        }
        
        this.ctx.putImageData(this.currentImage, 0, 0);
        this.redrawShapes();
        this.redrawTextElements();
        
        this.ctx.globalAlpha = this.maskOpacity;
        this.ctx.drawImage(
            this.maskImage,
            this.maskPosition.x,
            this.maskPosition.y,
            this.maskSize.width,
            this.maskSize.height
        );
        this.ctx.globalAlpha = 1.0;
        
        this.currentImage = this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height);
        
        this.removeMask();
        this.saveHistory();
        alert('Mask applied successfully!');
    }
    
    removeMask() {
        this.maskImage = null;
        this.maskPosition = { x: 50, y: 50 };
        this.maskSize = { width: 200, height: 200 };
        this.maskOpacity = 1.0;
        
        document.getElementById('maskImagePreview').style.display = 'none';
        document.getElementById('applyMask').style.display = 'none';
        document.getElementById('removeMask').style.display = 'none';
        document.getElementById('maskImageUpload').value = '';
        document.getElementById('maskOpacity').value = 100;
        document.getElementById('maskOpacityValue').textContent = '100%';
        
        this.ctx.putImageData(this.currentImage, 0, 0);
        this.redrawShapes();
        this.redrawTextElements();
    }
    
    // NEW: Collage feature methods
    loadCollageImage(e, index) {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (event) => {
            const img = new Image();
            img.onload = () => {
                this.collageImages[index] = img;
                this.updateCollagePreview();
            };
            img.src = event.target.result;
        };
        reader.readAsDataURL(file);
    }
    
    updateCollagePreview() {
        const preview = document.getElementById('collagePreview');
        if (preview) {
            preview.textContent = `${this.collageImages.filter(img => img).length}/4 images loaded`;
        }
    }
    
    createCollage() {
        const validImages = this.collageImages.filter(img => img);
        if (validImages.length < 2) {
            alert('Please upload at least 2 images for collage');
            return;
        }
        const size = 800;
        this.canvas.width = size;
        this.canvas.height = size;
        this.drawingCanvas.width = size;
        this.drawingCanvas.height = size;
        this.ctx.fillStyle = '#ffffff';
        this.ctx.fillRect(0, 0, size, size);
        
        if (this.collageLayout === 'grid') {
            // 2x2 Grid
            const half = size / 2;
            for (let i = 0; i < Math.min(4, validImages.length); i++) {
                const x = (i % 2) * half;
                const y = Math.floor(i / 2) * half;
                this.ctx.drawImage(validImages[i], x, y, half, half);
            }
        } else if (this.collageLayout === 'vertical') {
            // 2 columns
            const colWidth = size / 2;
            for (let i = 0; i < Math.min(2, validImages.length); i++) {
                this.ctx.drawImage(validImages[i], i * colWidth, 0, colWidth, size);
            }
        } else if (this.collageLayout === 'horizontal') {
            // 2 rows
            const rowHeight = size / 2;
            for (let i = 0; i < Math.min(2, validImages.length); i++) {
                this.ctx.drawImage(validImages[i], 0, i * rowHeight, size, rowHeight);
            }
        } else if (this.collageLayout === 'triple') {
            // 1 large + 2 small
            if (validImages.length >= 1) {
                this.ctx.drawImage(validImages[0], 0, 0, size / 2, size);
            }
            if (validImages.length >= 2) {
                this.ctx.drawImage(validImages[1], size / 2, 0, size / 2, size / 2);
            }
            if (validImages.length >= 3) {
                this.ctx.drawImage(validImages[2], size / 2, size / 2, size / 2, size / 2);
            }
        }
        
        this.currentImage = this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height);
        this.saveHistory();
        alert('Collage created! You can now edit or save it.');
    }
    
    saveHistory() {
        this.historyStep++;
        if (this.historyStep < this.history.length) {
            this.history.splice(this.historyStep);
        }
        const state = {
            imageData: this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height),
            shapes: JSON.parse(JSON.stringify(this.shapes)),
            textElements: JSON.parse(JSON.stringify(this.textElements)),
            width: this.canvas.width,
            height: this.canvas.height
        };
        this.history.push(state);
        if (this.history.length > 50) {
            this.history.shift();
            this.historyStep--;
        }
        this.updateUndoRedoButtons();
    }
    
    undo() {
        if (this.historyStep > 0) {
            this.historyStep--;
            this.restoreState(this.history[this.historyStep]);
            this.updateUndoRedoButtons();
        }
    }
    
    redo() {
        if (this.historyStep < this.history.length - 1) {
            this.historyStep++;
            this.restoreState(this.history[this.historyStep]);
            this.updateUndoRedoButtons();
        }
    }
    
    restoreState(state) {
        if (this.canvas.width !== state.width || this.canvas.height !== state.height) {
            this.canvas.width = state.width;
            this.canvas.height = state.height;
            this.drawingCanvas.width = state.width;
            this.drawingCanvas.height = state.height;
        }
        this.ctx.putImageData(state.imageData, 0, 0);
        this.currentImage = state.imageData;
        this.shapes = JSON.parse(JSON.stringify(state.shapes));
        this.textElements = JSON.parse(JSON.stringify(state.textElements));
        this.redrawWithShapes();
    }
    
    updateUndoRedoButtons() {
        const undoBtn = document.getElementById('undoBtn');
        const redoBtn = document.getElementById('redoBtn');
        if (undoBtn) {
            undoBtn.disabled = this.historyStep <= 0;
            undoBtn.style.opacity = this.historyStep <= 0 ? '0.5' : '1';
        }
        if (redoBtn) {
            redoBtn.disabled = this.historyStep >= this.history.length - 1;
            redoBtn.style.opacity = this.historyStep >= this.history.length - 1 ? '0.5' : '1';
        }
    }
    
    saveToGallery() {
        const saveBtn = document.getElementById('saveBtn');
        saveBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving...';
        saveBtn.disabled = true;
        this.ctx.putImageData(this.currentImage, 0, 0);
        this.redrawShapes();
        this.redrawTextElements();
        this.ctx.drawImage(this.drawingCanvas, 0, 0);
        const imageData = this.canvas.toDataURL('image/png');
        const formData = new FormData();
        formData.append('image_data', imageData);
        fetch('/upload_image', {
            method: 'POST',
            body: formData
        })
        .then(response => {
            if (response.ok) {
                alert('Image saved successfully!');
                window.location.href = '/dashboard';
            } else {
                throw new Error('Save failed');
            }
        })
        .catch(error => {
            alert('Failed to save image: ' + error.message);
            saveBtn.innerHTML = '<i class="fas fa-save"></i> Save to Gallery';
            saveBtn.disabled = false;
        });
    }
}

document.addEventListener('DOMContentLoaded', () => {
    new ImageEditor();
});