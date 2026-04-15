import { Card, CardContent } from "@/components/ui/card";
import { Construction } from "lucide-react";

interface Props {
  titulo: string;
  descricao: string;
  icone?: React.ReactNode;
}

export function GestaoPlaceholder({ titulo, descricao, icone }: Props) {
  return (
<div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            {icone}
            {titulo}
          </h1>
          <p className="text-muted-foreground text-sm mt-1">{descricao}</p>
        </div>
        <Card>
          <CardContent className="py-16 text-center">
            <Construction className="h-12 w-12 mx-auto mb-4 text-muted-foreground/40" />
            <p className="text-muted-foreground font-medium">Em desenvolvimento</p>
            <p className="text-sm text-muted-foreground mt-1">
              Esta funcionalidade será disponibilizada em breve.
            </p>
          </CardContent>
        </Card>
      </div>
);
}
