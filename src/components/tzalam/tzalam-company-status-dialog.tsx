"use client";

import { Check, X } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { TzalamCompany } from "@/lib/constants";

export interface CompanyStatus {
  total: number;
  present: number;
  pct: number;
  locked: boolean;
}

export interface TzalamCompanyStatusDialogProps {
  open: boolean;
  onClose: () => void;
  companies: TzalamCompany[];
  status: Map<string, CompanyStatus>;
  companyHe: (company: string) => string;
}

export function TzalamCompanyStatusDialog({
  open,
  onClose,
  companies,
  status,
  companyHe,
}: TzalamCompanyStatusDialogProps) {
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent dir="rtl" className="max-h-[90vh] overflow-y-auto sm:max-w-[560px]">
        <DialogHeader>
          <DialogTitle>סטטוס פלוגות — היום</DialogTitle>
        </DialogHeader>

        <div className="rounded-lg border">
          <Table dir="rtl">
            <TableHeader>
              <TableRow>
                <TableHead className="text-right">פלוגה</TableHead>
                <TableHead className="text-center">הגיש דוח</TableHead>
                <TableHead className="text-center">סומן</TableHead>
                <TableHead className="text-center">אחוז</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {companies.map((c) => {
                const s = status.get(c) ?? {
                  total: 0,
                  present: 0,
                  pct: 0,
                  locked: false,
                };
                const full = s.total > 0 && s.pct === 100;
                return (
                  <TableRow key={c}>
                    <TableCell className="text-right font-medium">
                      {companyHe(c)}
                    </TableCell>
                    <TableCell className="text-center">
                      {s.locked ? (
                        <Check className="mx-auto size-4 text-green-600" />
                      ) : (
                        <X className="mx-auto size-4 text-muted-foreground" />
                      )}
                    </TableCell>
                    <TableCell className="text-center text-sm">
                      {s.present}/{s.total}
                    </TableCell>
                    <TableCell className="text-center">
                      <span
                        className={
                          "inline-block min-w-12 rounded-md px-2 py-0.5 text-sm font-semibold " +
                          (full
                            ? "bg-green-100 text-green-700"
                            : "bg-red-100 text-red-700")
                        }
                      >
                        {s.pct}%
                      </span>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>

        <DialogFooter className="gap-2 sm:gap-2">
          <Button type="button" variant="outline" onClick={onClose}>
            סגור
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
