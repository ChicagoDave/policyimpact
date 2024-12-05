import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Alert, AlertTitle } from '@/components/ui/Alert';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { Loader2 } from 'lucide-react';
import useAuth from '@/hooks/UseAuth';

const LoginForm = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { login, error: authError, loading } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await login(email, password);
    
    // After successful login, redirect to the return URL or dashboard
    const returnUrl = searchParams.get('returnUrl') || '/dashboard';
    router.push(returnUrl);
  };

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle>Sign In</CardTitle>
        <CardDescription>
          Sign in to your Policy Impact account
        </CardDescription>
      </CardHeader>
      <form onSubmit={handleSubmit}>
        <CardContent className="space-y-4">
          {authError && (
            <Alert variant="destructive">
              <AlertTitle>{authError}</AlertTitle>
            </Alert>
          )}
          
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="Enter your email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              disabled={loading}
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              placeholder="Enter your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              disabled={loading}
            />
          </div>
        </CardContent>
        
        <CardFooter className="flex flex-col space-y-2">
          <Button 
            type="submit" 
            className="w-full"
            disabled={loading}
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Signing in...
              </>
            ) : (
              'Sign In'
            )}
          </Button>
          
          <Button
            type="button"
            variant="outline"
            className="w-full"
            onClick={() => router.push('/register')}
            disabled={loading}
          >
            Create an Account
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
};

export default LoginForm;