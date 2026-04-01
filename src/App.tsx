/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { POS } from '@/components/POS';
import { Inventory } from '@/components/Inventory';
import { Reports } from '@/components/Reports';
import { Toaster } from '@/components/ui/sonner';
import { Store, Package, BarChart3, Languages, LogOut } from 'lucide-react';
import { LanguageProvider, useLanguage } from '@/i18n/LanguageContext';
import { Button } from '@/components/ui/button';
import { AuthProvider, useAuth } from '@/components/AuthContext';

function AppContent() {
  const { t, language, setLanguage } = useLanguage();
  const { user, loading, signIn, logOut } = useAuth();

  const toggleLanguage = () => {
    setLanguage(language === 'en' ? 'bn' : 'en');
  };

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-background text-foreground flex items-center justify-center">
        <div className="text-center space-y-4 p-8 border rounded-lg shadow-lg bg-card">
          <Store className="h-16 w-16 mx-auto text-primary" />
          <h1 className="text-2xl font-bold tracking-tight">{t('appTitle')}</h1>
          <p className="text-muted-foreground">Please sign in to continue</p>
          <Button onClick={signIn} className="w-full">Sign In with Google</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <header className="bg-primary text-primary-foreground p-4 shadow-md flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{t('appTitle')}</h1>
          <p className="text-sm opacity-80">{t('appAddress')} | 01745543717, 01757290773</p>
        </div>
        <div className="flex items-center gap-2">
          <Button 
            variant="secondary" 
            size="sm" 
            onClick={toggleLanguage}
            className="flex items-center gap-2"
          >
            <Languages className="h-4 w-4" />
            {language === 'en' ? 'বাংলা' : 'English'}
          </Button>
          <Button variant="secondary" size="sm" onClick={logOut} title="Sign Out">
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </header>

      <main className="flex-1 container mx-auto p-4 md:p-6">
        <Tabs defaultValue="pos" className="w-full">
          <TabsList className="grid w-full max-w-md grid-cols-3 mb-8">
            <TabsTrigger value="pos" className="flex items-center gap-2">
              <Store className="h-4 w-4" /> {t('pos')}
            </TabsTrigger>
            <TabsTrigger value="inventory" className="flex items-center gap-2">
              <Package className="h-4 w-4" /> {t('inventory')}
            </TabsTrigger>
            <TabsTrigger value="reports" className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4" /> {t('reports')}
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="pos" className="mt-0 border rounded-lg bg-card text-card-foreground shadow-sm">
            <POS />
          </TabsContent>
          
          <TabsContent value="inventory" className="mt-0 border rounded-lg bg-card text-card-foreground shadow-sm">
            <Inventory />
          </TabsContent>
          
          <TabsContent value="reports" className="mt-0 border rounded-lg bg-card text-card-foreground shadow-sm">
            <Reports />
          </TabsContent>
        </Tabs>
      </main>
      
      <Toaster position="top-right" />
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <LanguageProvider>
        <AppContent />
      </LanguageProvider>
    </AuthProvider>
  );
}
