import SaasShell from './components/SaasShell';

export default function SaasLayout({ children }: { children: React.ReactNode }) {
  return <SaasShell>{children}</SaasShell>;
}
