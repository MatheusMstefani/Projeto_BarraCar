"use client";

import Image from "next/image";
import { useMemo, useState } from "react";
import { deletePhoto, editPhoto } from "@/app/(private)/ordens/[id]/actions";
import { ActionForm } from "@/components/action-form";

export type GalleryPhoto = {
  id: string;
  category: string;
  region: string;
  damageType: string | null;
  description: string | null;
  originalName: string;
  createdAt: string;
  uploadedBy: string;
  checklist: string | null;
  service: string | null;
  checksum: string | null;
};

export function PhotoGallery({
  workOrderId,
  photos,
}: {
  workOrderId: string;
  photos: GalleryPhoto[];
}) {
  const [category, setCategory] = useState("");
  const [region, setRegion] = useState("");
  const categories = useMemo(
    () => [...new Set(photos.map((photo) => photo.category))].sort(),
    [photos],
  );
  const regions = useMemo(
    () => [...new Set(photos.map((photo) => photo.region))].sort(),
    [photos],
  );
  const visible = photos.filter(
    (photo) =>
      (!category || photo.category === category) &&
      (!region || photo.region === region),
  );
  if (!photos.length)
    return <div className="card empty">Nenhuma foto adicionada.</div>;
  return (
    <>
      <div className="card photo-filters">
        <label>
          Categoria
          <select
            value={category}
            onChange={(event) => setCategory(event.target.value)}
          >
            <option value="">Todas</option>
            {categories.map((value) => (
              <option key={value}>{value}</option>
            ))}
          </select>
        </label>
        <label>
          Região
          <select
            value={region}
            onChange={(event) => setRegion(event.target.value)}
          >
            <option value="">Todas</option>
            {regions.map((value) => (
              <option key={value}>{value}</option>
            ))}
          </select>
        </label>
      </div>
      <p className="muted">
        {visible.length} de {photos.length} fotos — ordem cronológica.
      </p>
      <div className="gallery">
        {visible.map((photo) => (
          <article className="photo-card" key={photo.id}>
            <a
              href={`/api/media/photos/${photo.id}`}
              target="_blank"
              rel="noreferrer"
            >
              <Image
                src={`/api/media/photos/${photo.id}?thumbnail=1`}
                alt={photo.description ?? photo.originalName}
                width={800}
                height={600}
                unoptimized
              />
            </a>
            <strong>
              {photo.category} · {photo.region}
              {photo.damageType ? ` · ${photo.damageType}` : ""}
            </strong>
            {photo.checklist && <small>Checklist: {photo.checklist}</small>}
            {photo.service && <small>Serviço: {photo.service}</small>}
            <small>
              {photo.createdAt} · {photo.uploadedBy}
              {photo.checksum ? ` · ${photo.checksum.slice(0, 10)}` : ""}
            </small>
            <ActionForm action={editPhoto} className="form">
              <input type="hidden" name="workOrderId" value={workOrderId} />
              <input type="hidden" name="photoId" value={photo.id} />
              <label>
                Descrição
                <textarea
                  name="description"
                  defaultValue={photo.description ?? ""}
                />
              </label>
              <label>
                Motivo da alteração
                <input
                  name="reason"
                  placeholder="Obrigatório em evidência protegida"
                />
              </label>
              <button>Salvar descrição</button>
            </ActionForm>
            <ActionForm action={deletePhoto} className="form">
              <input type="hidden" name="workOrderId" value={workOrderId} />
              <input type="hidden" name="photoId" value={photo.id} />
              <label>
                Motivo da exclusão
                <input name="reason" />
              </label>
              <button>Excluir foto</button>
            </ActionForm>
            <a
              className="button"
              href={`/api/media/photos/${photo.id}?download=1`}
            >
              Baixar original
            </a>
          </article>
        ))}
      </div>
    </>
  );
}
