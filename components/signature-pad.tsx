"use client";

import { useRef, useState } from "react";
import { collectSignature } from "@/app/(private)/ordens/[id]/actions";

export function SignaturePad({ workOrderId }: { workOrderId: string }) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const imageInput = useRef<HTMLInputElement>(null);
  const drawing = useRef(false);
  const [hasSignature, setHasSignature] = useState(false);

  function coordinates(event: React.PointerEvent<HTMLCanvasElement>) {
    const element = canvas.current;
    if (!element) return null;
    const rect = element.getBoundingClientRect();
    return {
      x: (event.clientX - rect.left) * (element.width / rect.width),
      y: (event.clientY - rect.top) * (element.height / rect.height),
    };
  }

  function start(event: React.PointerEvent<HTMLCanvasElement>) {
    if (event.button !== 0 && event.pointerType === "mouse") return;
    const element = canvas.current;
    const position = coordinates(event);
    const context = element?.getContext("2d");
    if (!element || !position || !context) return;
    event.preventDefault();
    element.setPointerCapture(event.pointerId);
    context.beginPath();
    context.moveTo(position.x, position.y);
    context.lineWidth = 3;
    context.lineCap = "round";
    context.lineJoin = "round";
    context.strokeStyle = "#14251f";
    drawing.current = true;
  }

  function move(event: React.PointerEvent<HTMLCanvasElement>) {
    if (!drawing.current) return;
    const position = coordinates(event);
    const context = canvas.current?.getContext("2d");
    if (!position || !context) return;
    event.preventDefault();
    context.lineTo(position.x, position.y);
    context.stroke();
    setHasSignature(true);
  }

  function finish(event: React.PointerEvent<HTMLCanvasElement>) {
    if (!drawing.current) return;
    drawing.current = false;
    canvas.current?.getContext("2d")?.closePath();
    if (canvas.current?.hasPointerCapture(event.pointerId)) canvas.current.releasePointerCapture(event.pointerId);
  }

  function clear() {
    const element = canvas.current;
    element?.getContext("2d")?.clearRect(0, 0, element.width, element.height);
    drawing.current = false;
    setHasSignature(false);
    if (imageInput.current) imageInput.current.value = "";
  }

  function prepare(event: React.FormEvent<HTMLFormElement>) {
    if (!hasSignature) {
      event.preventDefault();
      window.alert("Clique ou toque no quadro e desenhe a assinatura antes de confirmar.");
      return;
    }
    if (imageInput.current) imageInput.current.value = canvas.current?.toDataURL("image/png") ?? "";
  }

  return <form action={collectSignature} className="card form" onSubmit={prepare}>
    <input type="hidden" name="workOrderId" value={workOrderId} />
    <input ref={imageInput} type="hidden" name="image" />
    <h3>Coletar assinatura</h3>
    <label>Tipo<select name="type"><option value="CUSTOMER_ENTRY">Cliente na entrada</option><option value="PROFESSIONAL">Profissional</option><option value="DELIVERY_RESPONSIBLE">Responsável pela entrega</option><option value="CUSTOMER_PICKUP">Cliente na retirada</option></select></label>
    <label>Nome do assinante<input name="signerName" required /></label>
    <p className="muted">Clique e mantenha pressionado para assinar. Em celular, toque e arraste.</p>
    <canvas ref={canvas} width={700} height={220} className="signature" onPointerDown={start} onPointerMove={move} onPointerUp={finish} onPointerCancel={finish} />
    <div className="actions"><button type="button" onClick={clear}>Limpar</button><button type="submit" disabled={!hasSignature}>Confirmar assinatura</button></div>
  </form>;
}
