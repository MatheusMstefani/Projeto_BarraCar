"use client";

import Image from "next/image";
import { useActionState, useEffect, useRef, useState } from "react";
import { uploadPhotos, type PhotoUploadState } from "@/app/(private)/ordens/[id]/actions";

type Option = { id: string; label: string };

export function PhotoUpload({ workOrderId }: { workOrderId: string }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const [files, setFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [category, setCategory] = useState("GENERAL_ENTRY");
  const [options, setOptions] = useState<{
    checklist: Option[];
    services: Option[];
  }>({ checklist: [], services: [] });
  const initialState: PhotoUploadState = { success: false, message: "" };
  const [state, formAction, pending] = useActionState(uploadPhotos, initialState);

  useEffect(() => {
    fetch(`/api/work-orders/${workOrderId}/photo-options`)
      .then((response) => response.json())
      .then(setOptions);
  }, [workOrderId]);
  useEffect(() => {
    const urls = files.map(URL.createObjectURL);
    setPreviews(urls);
    return () => urls.forEach(URL.revokeObjectURL);
  }, [files]);
  useEffect(() => {
    if (!state.success) return;
    setFiles([]);
    formRef.current?.reset();
    setCategory("GENERAL_ENTRY");
  }, [state]);

  function replaceFiles(next: File[]) {
    setFiles(next);
    if (!inputRef.current) return;
    const transfer = new DataTransfer();
    next.forEach((file) => transfer.items.add(file));
    inputRef.current.files = transfer.files;
  }

  return (
    <form
      ref={formRef}
      action={formAction}
      className="card form"
    >
      <input type="hidden" name="workOrderId" value={workOrderId} />
      <h3>Adicionar fotos</h3>
      <label>
        Categoria
        <select
          name="category"
          value={category}
          onChange={(event) => setCategory(event.target.value)}
        >
          <option value="GENERAL_ENTRY">Visão geral de entrada</option>
          <option value="DAMAGE">Avaria existente</option>
          <option value="SERVICE_AREA">Área que receberá serviço</option>
          <option value="BEFORE_SERVICE">Antes do serviço</option>
          <option value="DURING_SERVICE">Durante o serviço</option>
          <option value="AFTER_SERVICE">Depois do serviço</option>
          <option value="DELIVERY">Entrega</option>
          <option value="DASHBOARD">Painel</option>
          <option value="INTERIOR">Interior</option>
          <option value="PERSONAL_OBJECT">Objeto no veículo</option>
          <option value="DOCUMENT">Documento</option>
          <option value="OTHER">Outra</option>
        </select>
      </label>
      <label>
        Região
        <select name="region">
          <option value="FRONT">Frente</option>
          <option value="REAR">Traseira</option>
          <option value="LEFT_SIDE">Lateral esquerda</option>
          <option value="RIGHT_SIDE">Lateral direita</option>
          <option value="FRONT_BUMPER">Para-choque dianteiro</option>
          <option value="REAR_BUMPER">Para-choque traseiro</option>
          <option value="HOOD">Capô</option>
          <option value="ROOF">Teto</option>
          <option value="FRONT_LEFT_DOOR">Porta dianteira esquerda</option>
          <option value="FRONT_RIGHT_DOOR">Porta dianteira direita</option>
          <option value="REAR_LEFT_DOOR">Porta traseira esquerda</option>
          <option value="REAR_RIGHT_DOOR">Porta traseira direita</option>
          <option value="FENDER">Para-lama</option>
          <option value="WHEEL">Roda</option>
          <option value="TIRE">Pneu</option>
          <option value="WINDOW">Vidro</option>
          <option value="MIRROR">Retrovisor</option>
          <option value="HEADLIGHT">Farol</option>
          <option value="TAILLIGHT">Lanterna</option>
          <option value="INTERIOR">Interior</option>
          <option value="SEAT">Banco</option>
          <option value="DASHBOARD">Painel</option>
          <option value="TRUNK">Porta-malas</option>
          <option value="ENGINE">Motor</option>
          <option value="OTHER">Outra</option>
        </select>
      </label>
      {category === "DAMAGE" && (
        <label>
          Tipo de avaria
          <select name="damageType" required>
            <option value="SCRATCH">Risco</option>
            <option value="SCUFF">Arranhão</option>
            <option value="DENT">Amassado</option>
            <option value="CRACK">Trinca</option>
            <option value="BROKEN">Quebra</option>
            <option value="LOOSE_PART">Peça solta</option>
            <option value="PEELING_PAINT">Pintura descascada</option>
            <option value="SCRATCHED_WHEEL">Roda riscada</option>
            <option value="DAMAGED_TIRE">Pneu danificado</option>
            <option value="TORN_SEAT">Banco rasgado</option>
            <option value="STAIN">Mancha</option>
            <option value="DASHBOARD_WARNING">Alerta no painel</option>
            <option value="MALFUNCTION">Mau funcionamento</option>
            <option value="MISSING_ACCESSORY">Acessório ausente</option>
            <option value="OTHER">Outro</option>
          </select>
        </label>
      )}
      <label>
        Checklist relacionado
        <select name="checklistItemId">
          <option value="">Nenhum</option>
          {options.checklist.map((option) => (
            <option key={option.id} value={option.id}>
              {option.label}
            </option>
          ))}
        </select>
      </label>
      <label>
        Serviço relacionado
        <select name="workOrderItemId">
          <option value="">Nenhum</option>
          {options.services.map((option) => (
            <option key={option.id} value={option.id}>
              {option.label}
            </option>
          ))}
        </select>
      </label>
      <label>
        Descrição
        <textarea
          name="description"
          placeholder="Descreva a avaria ou área fotografada"
        />
      </label>
      <label>
        Câmera ou galeria
        <input
          ref={inputRef}
          name="photos"
          type="file"
          accept="image/jpeg,image/png,image/webp"
          capture="environment"
          multiple
          required
          onChange={(event) =>
            replaceFiles(Array.from(event.target.files ?? []).slice(0, 10))
          }
        />
      </label>
      <p className="muted">
        Até 10 fotos JPG, PNG ou WEBP por envio; limite configurável de 10 MB
        por foto.
      </p>
      <div className="preview-grid">
        {previews.map((src, index) => (
          <div key={src} className="photo-card">
            <Image
              src={src}
              alt={`Prévia ${index + 1}`}
              width={800}
              height={600}
              unoptimized
            />
            <button
              type="button"
              onClick={() =>
                replaceFiles(
                  files.filter((_, itemIndex) => itemIndex !== index),
                )
              }
            >
              Remover
            </button>
          </div>
        ))}
      </div>
      {state.message && <p className={state.success ? "success" : "error"} role="status">{state.message}</p>}
      <button disabled={pending || files.length === 0}>
        {pending
          ? "Enviando..."
          : `Salvar ${files.length || ""} foto${files.length === 1 ? "" : "s"}`}
      </button>
    </form>
  );
}
