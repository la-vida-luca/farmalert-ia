import { useState, useEffect, useCallback } from 'react';
import { toast } from 'react-toastify';
import { notificationService } from '@/services/api';

interface NotificationPermission {
  permission: NotificationPermission | null;
  isSupported: boolean;
  isGranted: boolean;
  isDenied: boolean;
  isDefault: boolean;
}

interface PushSubscription {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
}

export function useNotifications() {
  const [permission, setPermission] = useState<NotificationPermission>({
    permission: null,
    isSupported: false,
    isGranted: false,
    isDenied: false,
    isDefault: false,
  });
  const [subscription, setSubscription] = useState<PushSubscription | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Vérifier le support des notifications
  useEffect(() => {
    const isSupported = 'Notification' in window && 'serviceWorker' in navigator;
    const currentPermission = isSupported ? Notification.permission : null;
    
    setPermission({
      permission: currentPermission,
      isSupported,
      isGranted: currentPermission === 'granted',
      isDenied: currentPermission === 'denied',
      isDefault: currentPermission === 'default',
    });
  }, []);

  // Demander la permission pour les notifications
  const requestPermission = useCallback(async (): Promise<boolean> => {
    if (!permission.isSupported) {
      toast.error('Les notifications ne sont pas supportées sur cet appareil');
      return false;
    }

    if (permission.isGranted) {
      return true;
    }

    try {
      const result = await Notification.requestPermission();
      const isGranted = result === 'granted';
      
      setPermission(prev => ({
        ...prev,
        permission: result,
        isGranted,
        isDenied: result === 'denied',
        isDefault: result === 'default',
      }));

      if (isGranted) {
        toast.success('Notifications activées !');
      } else if (result === 'denied') {
        toast.error('Notifications refusées. Vous pouvez les activer dans les paramètres du navigateur.');
      }

      return isGranted;
    } catch (error) {
      console.error('Erreur lors de la demande de permission:', error);
      toast.error('Erreur lors de l\'activation des notifications');
      return false;
    }
  }, [permission.isSupported, permission.isGranted]);

  // S'abonner aux notifications push
  const subscribe = useCallback(async (): Promise<boolean> => {
    if (!permission.isGranted) {
      const hasPermission = await requestPermission();
      if (!hasPermission) return false;
    }

    setIsLoading(true);
    
    try {
      // Récupérer la clé publique VAPID
      const { publicKey } = await notificationService.getVapidPublicKey();
      
      // Convertir la clé publique
      const applicationServerKey = urlBase64ToUint8Array(publicKey);
      
      // Obtenir l'abonnement push
      const registration = await navigator.serviceWorker.ready;
      const pushSubscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey,
      });

      // Convertir l'abonnement en format utilisable
      const subscriptionData: PushSubscription = {
        endpoint: pushSubscription.endpoint,
        keys: {
          p256dh: arrayBufferToBase64(pushSubscription.getKey('p256dh')!),
          auth: arrayBufferToBase64(pushSubscription.getKey('auth')!),
        },
      };

      // Envoyer l'abonnement au serveur
      await notificationService.subscribe(subscriptionData);
      
      setSubscription(subscriptionData);
      toast.success('Abonnement aux notifications réussi !');
      
      return true;
    } catch (error) {
      console.error('Erreur lors de l\'abonnement:', error);
      toast.error('Erreur lors de l\'abonnement aux notifications');
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [permission.isGranted, requestPermission]);

  // Se désabonner des notifications push
  const unsubscribe = useCallback(async (): Promise<boolean> => {
    if (!subscription) return false;

    setIsLoading(true);
    
    try {
      await notificationService.unsubscribe(subscription.endpoint);
      
      // Se désabonner du service worker
      const registration = await navigator.serviceWorker.ready;
      const pushSubscription = await registration.pushManager.getSubscription();
      
      if (pushSubscription) {
        await pushSubscription.unsubscribe();
      }
      
      setSubscription(null);
      toast.info('Désabonnement des notifications réussi');
      
      return true;
    } catch (error) {
      console.error('Erreur lors du désabonnement:', error);
      toast.error('Erreur lors du désabonnement');
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [subscription]);

  // Envoyer une notification de test
  const sendTestNotification = useCallback(async (): Promise<boolean> => {
    if (!subscription) {
      toast.error('Aucun abonnement actif');
      return false;
    }

    try {
      await notificationService.sendTestNotification('Test de notification FarmAlert IA');
      toast.success('Notification de test envoyée !');
      return true;
    } catch (error) {
      console.error('Erreur lors de l\'envoi de la notification de test:', error);
      toast.error('Erreur lors de l\'envoi de la notification de test');
      return false;
    }
  }, [subscription]);

  // Vérifier l'état de l'abonnement existant
  const checkExistingSubscription = useCallback(async () => {
    try {
      const registration = await navigator.serviceWorker.ready;
      const existingSubscription = await registration.pushManager.getSubscription();
      
      if (existingSubscription) {
        const subscriptionData: PushSubscription = {
          endpoint: existingSubscription.endpoint,
          keys: {
            p256dh: arrayBufferToBase64(existingSubscription.getKey('p256dh')!),
            auth: arrayBufferToBase64(existingSubscription.getKey('auth')!),
          },
        };
        setSubscription(subscriptionData);
      }
    } catch (error) {
      console.error('Erreur lors de la vérification de l\'abonnement existant:', error);
    }
  }, []);

  // Vérifier l'abonnement existant au montage
  useEffect(() => {
    if (permission.isGranted) {
      checkExistingSubscription();
    }
  }, [permission.isGranted, checkExistingSubscription]);

  return {
    permission,
    subscription,
    isLoading,
    requestPermission,
    subscribe,
    unsubscribe,
    sendTestNotification,
    checkExistingSubscription,
  };
}

// Fonctions utilitaires pour la conversion des clés
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding)
    .replace(/-/g, '+')
    .replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return window.btoa(binary);
}

// Hook pour afficher les notifications toast
export function useToastNotifications() {
  useEffect(() => {
    // Écouter les messages du service worker
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.addEventListener('message', (event) => {
        const { type, data } = event.data;
        
        if (type === 'NOTIFICATION_RECEIVED') {
          toast.info(data.message || 'Nouvelle notification reçue');
        }
      });
    }
  }, []);
}