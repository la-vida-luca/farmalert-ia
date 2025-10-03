import { useState, useEffect, useCallback } from 'react';
import { toast } from 'react-toastify';
import apiService from '@/services/api';

interface NotificationState {
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
  const [permission, setPermission] = useState<NotificationState>({
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

    if (permission.isDenied) {
      toast.error('Les notifications ont été refusées. Veuillez autoriser les notifications dans les paramètres de votre navigateur.');
      return false;
    }

    try {
      const result = await Notification.requestPermission();
      const newState = {
        permission: result,
        isSupported: permission.isSupported,
        isGranted: result === 'granted',
        isDenied: result === 'denied',
        isDefault: result === 'default',
      };
      setPermission(newState);

      if (result === 'granted') {
        toast.success('Notifications activées avec succès!');
        return true;
      } else if (result === 'denied') {
        toast.error('Les notifications ont été refusées');
        return false;
      }
      return false;
    } catch (error) {
      console.error('Erreur lors de la demande de permission:', error);
      toast.error('Erreur lors de la demande de permission pour les notifications');
      return false;
    }
  }, [permission.isSupported, permission.isDenied]);

  // S'abonner aux notifications push
  const subscribe = useCallback(async () => {
    if (!permission.isGranted) {
      toast.error('Veuillez d\'abord autoriser les notifications');
      return;
    }

    setIsLoading(true);
    try {
      // Vérifier si un service worker est disponible
      const registration = await navigator.serviceWorker.ready;
      
      // Vérifier si une souscription existe déjà
      let pushSubscription = await registration.pushManager.getSubscription();
      
      if (!pushSubscription) {
        // Créer une nouvelle souscription
        const vapidPublicKey = import.meta.env.VITE_VAPID_PUBLIC_KEY;
        if (!vapidPublicKey) {
          throw new Error('Clé VAPID publique manquante');
        }

        const convertedVapidKey = urlBase64ToUint8Array(vapidPublicKey);
        pushSubscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: convertedVapidKey,
        });
      }

      // Convertir la souscription en format JSON
      const subscriptionJSON = pushSubscription.toJSON();
      const subscriptionData: PushSubscription = {
        endpoint: subscriptionJSON.endpoint!,
        keys: {
          p256dh: subscriptionJSON.keys!.p256dh,
          auth: subscriptionJSON.keys!.auth,
        },
      };

      // Envoyer la souscription au backend (à implémenter)
      // await apiService.subscribeToNotifications(subscriptionData);
      
      setSubscription(subscriptionData);
      toast.success('Abonnement aux notifications réussi!');
    } catch (error) {
      console.error('Erreur lors de l\'abonnement aux notifications:', error);
      toast.error('Erreur lors de l\'abonnement aux notifications');
    } finally {
      setIsLoading(false);
    }
  }, [permission.isGranted]);

  // Se désabonner des notifications push
  const unsubscribe = useCallback(async () => {
    setIsLoading(true);
    try {
      const registration = await navigator.serviceWorker.ready;
      const pushSubscription = await registration.pushManager.getSubscription();
      
      if (pushSubscription) {
        await pushSubscription.unsubscribe();
        // Informer le backend (à implémenter)
        // await apiService.unsubscribeFromNotifications();
        setSubscription(null);
        toast.success('Désabonnement des notifications réussi');
      }
    } catch (error) {
      console.error('Erreur lors du désabonnement:', error);
      toast.error('Erreur lors du désabonnement des notifications');
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Envoyer une notification de test
  const sendTestNotification = useCallback(() => {
    if (!permission.isGranted) {
      toast.error('Veuillez d\'abord autoriser les notifications');
      return;
    }

    try {
      new Notification('FarmAlert - Test', {
        body: 'Ceci est une notification de test',
        icon: '/favicon.ico',
        badge: '/favicon.ico',
        tag: 'test-notification',
      });
    } catch (error) {
      console.error('Erreur lors de l\'envoi de la notification de test:', error);
      toast.error('Erreur lors de l\'envoi de la notification de test');
    }
  }, [permission.isGranted]);

  // Vérifier si une souscription existe déjà
  const checkExistingSubscription = useCallback(async () => {
    if (!permission.isGranted) return;

    try {
      const registration = await navigator.serviceWorker.ready;
      const pushSubscription = await registration.pushManager.getSubscription();
      
      if (pushSubscription) {
        const subscriptionJSON = pushSubscription.toJSON();
        setSubscription({
          endpoint: subscriptionJSON.endpoint!,
          keys: {
            p256dh: subscriptionJSON.keys!.p256dh,
            auth: subscriptionJSON.keys!.auth,
          },
        });
      }
    } catch (error) {
      console.error('Erreur lors de la vérification de la souscription:', error);
    }
  }, [permission.isGranted]);

  // Vérifier la souscription existante au montage
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
function urlBase64ToUint8Array(base64String: string): ArrayBuffer {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding)
    .replace(/-/g, '+')
    .replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }

  return outputArray.buffer;
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
