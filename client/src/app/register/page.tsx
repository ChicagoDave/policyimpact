// client/src/app/register/page.tsx
'use client';

import RegisterForm from '@/components/auth/RegisterForm';

export default function RegisterPage() {
  return (
    <div className="container mx-auto px-4 py-8">
      <RegisterForm />
    </div>
  );
}