"use client";

import { useState, useCallback } from "react";
import Cropper from "react-easy-crop";
import Modal from "./Modal";
import Button from "./Button";
import { getCroppedImg } from "@/lib/utils/cropImage";

interface ImageCropperProps {
  open: boolean;
  imageSrc: string;
  onClose: () => void;
  onCropCompleteAction: (croppedFile: File) => void;
  aspect?: number;
}

export default function ImageCropper({
  open,
  imageSrc,
  onClose,
  onCropCompleteAction,
  aspect = 16 / 9,
}: ImageCropperProps) {
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<any>(null);
  const [processing, setProcessing] = useState(false);

  const onCropComplete = useCallback((_: any, croppedAreaPixels: any) => {
    setCroppedAreaPixels(croppedAreaPixels);
  }, []);

  async function handleSave() {
    if (!croppedAreaPixels || !imageSrc) return;
    setProcessing(true);
    try {
      const croppedFile = await getCroppedImg(imageSrc, croppedAreaPixels, "cover.jpg");
      if (croppedFile) {
        onCropCompleteAction(croppedFile);
      }
      onClose();
    } catch (e) {
      console.error(e);
    } finally {
      setProcessing(false);
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Crop Cover Photo" size="lg">
      <div className="space-y-4">
        <div className="relative w-full h-[50vh] bg-black/5 rounded-xl overflow-hidden">
          <Cropper
            image={imageSrc}
            crop={crop}
            zoom={zoom}
            aspect={aspect}
            onCropChange={setCrop}
            onCropComplete={onCropComplete}
            onZoomChange={setZoom}
          />
        </div>
        <div className="flex flex-col gap-1 px-2">
          <label className="text-xs text-[#A09080] font-medium tracking-wide">ZOOM</label>
          <input
            type="range"
            value={zoom}
            min={1}
            max={3}
            step={0.1}
            aria-labelledby="Zoom"
            onChange={(e) => setZoom(Number(e.target.value))}
            className="w-full accent-[#B89B72]"
          />
        </div>
        <div className="flex justify-end gap-3 pt-4 border-t border-[#EDE7DD]">
          <Button variant="outline" onClick={onClose} disabled={processing}>Cancel</Button>
          <Button onClick={handleSave} loading={processing}>Save Crop</Button>
        </div>
      </div>
    </Modal>
  );
}
