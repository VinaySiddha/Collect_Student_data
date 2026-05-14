'use client';

import { useRef, useState } from 'react';
import { FiCrop, FiX } from 'react-icons/fi';

interface Props {
  src: string;
  onConfirm: (cropped: string) => void;
  onCancel: () => void;
}

export default function CropModal({ src, onConfirm, onCancel }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [box, setBox] = useState({ x: 0, y: 0, size: 0 });
  const [imgArea, setImgArea] = useState({ x: 0, y: 0, w: 0, h: 0 });
  const naturalRef = useRef({ w: 0, h: 0 });
  const dragRef = useRef<{
    kind: 'move' | 'resize';
    startX: number; startY: number;
    origBox: typeof box;
  } | null>(null);

  const clientPos = (e: React.MouseEvent | React.TouchEvent) =>
    'touches' in e
      ? { cx: e.touches[0].clientX, cy: e.touches[0].clientY }
      : { cx: (e as React.MouseEvent).clientX, cy: (e as React.MouseEvent).clientY };

  const clamp = (b: typeof box, area: typeof imgArea) => {
    const minSize = 60;
    const size = Math.max(minSize, Math.min(b.size, area.w, area.h));
    const x = Math.max(area.x, Math.min(b.x, area.x + area.w - size));
    const y = Math.max(area.y, Math.min(b.y, area.y + area.h - size));
    return { x, y, size };
  };

  const initBox = (nw: number, nh: number) => {
    const container = containerRef.current;
    if (!container) return;
    const cw = container.clientWidth;
    const ch = container.clientHeight;
    const scale = Math.min(cw / nw, ch / nh);
    const rw = nw * scale;
    const rh = nh * scale;
    const rx = (cw - rw) / 2;
    const ry = (ch - rh) / 2;
    const area = { x: rx, y: ry, w: rw, h: rh };
    setImgArea(area);
    const size = Math.min(rw, rh) * 0.85;
    setBox({ x: rx + (rw - size) / 2, y: ry + (rh - size) / 2, size });
  };

  const onPointerDown = (kind: 'move' | 'resize', e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const { cx, cy } = clientPos(e);
    dragRef.current = { kind, startX: cx, startY: cy, origBox: { ...box } };
  };

  const onPointerMove = (e: React.MouseEvent | React.TouchEvent) => {
    if (!dragRef.current) return;
    e.preventDefault();
    const { cx, cy } = clientPos(e);
    const dx = cx - dragRef.current.startX;
    const dy = cy - dragRef.current.startY;
    const ob = dragRef.current.origBox;
    const nb = dragRef.current.kind === 'move'
      ? { size: ob.size, x: ob.x + dx, y: ob.y + dy }
      : { x: ob.x, y: ob.y, size: ob.size + (dx + dy) / 2 };
    setBox(clamp(nb, imgArea));
  };

  const onPointerUp = () => { dragRef.current = null; };

  const handleConfirm = () => {
    const img = new window.Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const { w: nw, h: nh } = naturalRef.current;
      if (!nw || !nh) return;
      const scale = imgArea.w / nw;
      const canvas = document.createElement('canvas');
      canvas.width = 400; canvas.height = 400;
      canvas.getContext('2d')!.drawImage(
        img,
        (box.x - imgArea.x) / scale, (box.y - imgArea.y) / scale,
        box.size / scale, box.size / scale,
        0, 0, 400, 400,
      );
      onConfirm(canvas.toDataURL('image/png'));
    };
    img.src = src;
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm sm:max-w-md lg:max-w-lg overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
          <div>
            <h3 className="font-black text-slate-900 text-sm flex items-center gap-2">
              <FiCrop className="w-4 h-4" /> Crop Photo
            </h3>
            <p className="text-[0.6rem] text-slate-400 mt-0.5">Drag to move · corner handle to resize</p>
          </div>
          <button onClick={onCancel} className="w-7 h-7 flex items-center justify-center rounded text-slate-400 hover:text-slate-900 hover:bg-slate-100 transition">
            <FiX className="w-4 h-4" />
          </button>
        </div>

        <img src={src} alt="" className="hidden" onLoad={e => {
          const img = e.currentTarget;
          naturalRef.current = { w: img.naturalWidth, h: img.naturalHeight };
          initBox(img.naturalWidth, img.naturalHeight);
        }} />

        <div
          ref={containerRef}
          className="relative bg-black select-none overflow-hidden touch-none"
          style={{ height: 'clamp(300px, 45vw, 460px)' }}
          onMouseMove={onPointerMove} onMouseUp={onPointerUp} onMouseLeave={onPointerUp}
          onTouchMove={onPointerMove} onTouchEnd={onPointerUp}
        >
          <img src={src} alt="Crop preview" draggable={false} className="absolute inset-0 w-full h-full object-contain pointer-events-none" />

          {imgArea.w > 0 && <>
            <div className="absolute bg-black/60 pointer-events-none" style={{ left: imgArea.x, top: imgArea.y, width: imgArea.w, height: box.y - imgArea.y }} />
            <div className="absolute bg-black/60 pointer-events-none" style={{ left: imgArea.x, top: box.y + box.size, width: imgArea.w, height: imgArea.y + imgArea.h - box.y - box.size }} />
            <div className="absolute bg-black/60 pointer-events-none" style={{ left: imgArea.x, top: box.y, width: box.x - imgArea.x, height: box.size }} />
            <div className="absolute bg-black/60 pointer-events-none" style={{ left: box.x + box.size, top: box.y, width: imgArea.x + imgArea.w - box.x - box.size, height: box.size }} />
          </>}

          {box.size > 0 && (
            <div
              className="absolute border-2 border-white cursor-move touch-none"
              style={{ left: box.x, top: box.y, width: box.size, height: box.size }}
              onMouseDown={e => onPointerDown('move', e)}
              onTouchStart={e => onPointerDown('move', e)}
            >
              <div className="absolute inset-0 pointer-events-none" style={{
                backgroundImage: 'linear-gradient(rgba(255,255,255,0.25) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,0.25) 1px,transparent 1px)',
                backgroundSize: '33.33% 33.33%',
              }} />
              <div className="absolute -top-1.5 -left-1.5 w-3 h-3 bg-white rounded-sm pointer-events-none" />
              <div className="absolute -top-1.5 -right-1.5 w-3 h-3 bg-white rounded-sm pointer-events-none" />
              <div className="absolute -bottom-1.5 -left-1.5 w-3 h-3 bg-white rounded-sm pointer-events-none" />
              <div
                className="absolute -bottom-2 -right-2 w-6 h-6 bg-blue-500 rounded-full cursor-se-resize flex items-center justify-center"
                onMouseDown={e => onPointerDown('resize', e)}
                onTouchStart={e => onPointerDown('resize', e)}
              >
                <div className="w-2 h-2 border-r-2 border-b-2 border-white" />
              </div>
            </div>
          )}
        </div>

        <div className="p-4 flex gap-3">
          <button onClick={handleConfirm} className="flex-1 bg-blue-600 text-white font-black py-2.5 rounded-lg hover:bg-blue-700 transition text-sm active:scale-95">
            Apply Crop
          </button>
          <button onClick={onCancel} className="px-5 py-2.5 rounded-lg border border-slate-200 text-sm font-bold text-slate-600 hover:bg-slate-50 transition">
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
