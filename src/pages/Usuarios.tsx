import { useTranslation } from 'react-i18next';
import AdminUsers from "./AdminUsers";

export default function Usuarios() {
  const { t } = useTranslation();
  return <AdminUsers />;
}
