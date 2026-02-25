"use client";

import React, { useEffect } from 'react';
import { Auth } from '@supabase/auth-ui-react';
import { ThemeSupa } from '@supabase/auth-ui-shared';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/components/auth/AuthProvider';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

const Login = () => {
  const { session, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (session && !loading) {
      navigate('/');
    }
  }, [session, loading, navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md bg-card/80 backdrop-blur-sm border-primary/20 shadow-2xl">
        <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
                <div className="p-3 bg-primary/10 rounded-2xl">
                    <BarChart className="h-10 w-10 text-primary" />
                </div>
            </div>
          <CardTitle className="text-3xl font-black tracking-tighter">RICO 2.0</CardTitle>
          <p className="text-sm text-muted-foreground mt-2">Escolha como deseja acessar</p>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-4">
            <Button 
                onClick={() => navigate('/')} 
                variant="outline" 
                className="w-full h-12 font-bold flex items-center justify-between group"
            >
                Entrar sem Login (Modo Rápido)
                <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
            </Button>
            
            <div className="relative">
                <div className="absolute inset-0 flex items-center"><span className="w-full border-t" /></div>
                <div className="relative flex justify-center text-xs uppercase"><span className="bg-background px-2 text-muted-foreground">Ou use E-mail</span></div>
            </div>

            <Auth
                supabaseClient={supabase}
                providers={[]} // Removido Google para facilitar
                appearance={{ 
                    theme: ThemeSupa,
                    variables: {
                        default: {
                            colors: {
                                brand: 'hsl(var(--primary))',
                                brandAccent: 'hsl(var(--primary))',
                            }
                        }
                    },
                    className: {
                        button: 'font-bold py-2',
                        input: 'bg-muted/50 border-none'
                    }
                }}
                theme="dark"
                localization={{
                    variables: {
                        sign_in: {
                            email_label: 'E-mail',
                            password_label: 'Senha',
                            button_label: 'Entrar',
                            link_text: 'Já tem conta? Entre',
                        },
                        sign_up: {
                            email_label: 'E-mail',
                            password_label: 'Crie uma senha',
                            button_label: 'Cadastrar',
                            link_text: 'Não tem conta? Cadastre-se',
                        }
                    }
                }}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Login;