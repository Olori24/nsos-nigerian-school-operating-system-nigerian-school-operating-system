import { RotateCcw } from "lucide-react";
import { useState } from "react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";

export const CLEAR_FORM_TITLE = "Clear this biodata form?";
export const CLEAR_FORM_DESCRIPTION = "This will remove every field you entered and delete the saved draft from this browser. This action cannot be undone.";

export function ClearFormConfirmation({ onConfirm }: { onConfirm: () => void }) {
  const [open, setOpen] = useState(false);
  return <AlertDialog open={open} onOpenChange={setOpen}><AlertDialogTrigger asChild><button type="button" className="biodata-clear-trigger inline-flex items-center gap-2 rounded-xl border border-[#e2cac6] bg-white px-4 py-2.5 text-sm font-bold text-[#9b3d35] transition hover:bg-[#fff7f5]"><RotateCcw className="h-4 w-4" />Clear form</button></AlertDialogTrigger><AlertDialogContent className="biodata-clear-confirmation border-[#e2d7d3] bg-[#fffdfc]"><AlertDialogHeader><AlertDialogTitle className="text-[#542c28]">{CLEAR_FORM_TITLE}</AlertDialogTitle><AlertDialogDescription className="leading-6 text-[#735d59]">{CLEAR_FORM_DESCRIPTION}</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel className="border-[#d8ddd8]">Keep editing</AlertDialogCancel><AlertDialogAction onClick={() => { onConfirm(); setOpen(false); }} className="bg-[#9b3d35] text-white hover:bg-[#82322c]">Clear form and draft</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>;
}
