"use client";
import { useRef, useState } from "react";
import { collectSignature } from "@/app/(private)/ordens/[id]/actions";

export function SignaturePad({ workOrderId }: { workOrderId: string }) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const imageInput = useRef<HTMLInputElement>(null);
  const [drawing, setDrawing] = useState(false);
  const point = (event: React.PointerEvent<HTMLCanvasElement>) => {
    const element = canvas.current; if (!element) return;
    const rect = element.getBoundingClientRect(), context = element.getContext("2d"); if (!context) return;
    const x = (event.clientX - rect.left) * (element.width / rect.width), y = (event.clientY - rect.top) * (element.height / rect.height);
    if (!drawing) { context.beginPath(); context.moveTo(x, y); setDrawing(true); } else { context.lineTo(x, y); context.lineWidth = 3; context.lineCap = "round"; context.stroke(); }
  };
  const finish = () => setDrawing(false);
  const clear = () => { const element = canvas.current; element?.getContext("2d")?.clearRect(0, 0, element.width, element.height); if (imageInput.current) imageInput.current.value = ""; };
  const prepare = () => { if (imageInput.current) imageInput.current.value = canvas.current?.toDataURL("image/png") ?? ""; };
  return <form action={collectSignature} className="card form" onSubmit={prepare}><input type="hidden" name="workOrderId" value={workOrderId}/><input ref={imageInput} type="hidden" name="image"/><h3>Coletar assinatura</h3><label>Tipo<select name="type"><option value="CUSTOMER_ENTRY">Cliente na entrada</option><option value="PROFESSIONAL">Profissional</option><option value="DELIVERY_RESPONSIBLE">Responsável pela entrega</option><option value="CUSTOMER_PICKUP">Cliente na retirada</option></select></label><label>Nome do assinante<input name="signerName" required/></label><canvas ref={canvas} width={700} height={220} className="signature" onPointerDown={point} onPointerMove={point} onPointerUp={finish} onPointerLeave={finish}/><div className="actions"><button type="button" onClick={clear}>Limpar</button><button type="submit">Confirmar assinatura</button></div></form>;
}
