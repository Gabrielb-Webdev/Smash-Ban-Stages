import React, { useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import { StatusBar } from 'expo-status-bar';
import { View, ActivityIndicator, Text, TouchableOpacity } from 'react-native';
import { AuthProvider, useAuth } from './src/context/AuthContext';
import { notificationService } from './src/services/notificationService';

// Screens
import LoginScreen from './src/screens/LoginScreen';
import HomeScreen from './src/screens/HomeScreen';
import TournamentsScreen from './src/screens/TournamentsScreen';

// Icons (you might want to use react-native-vector-icons instead)
const TabIcon = ({ name, focused }: { name: string; focused: boolean }) => {
  const icons = {
    Home: focused ? '🏠' : '🏡',
    Tournaments: focused ? '🏆' : '🏅',
    Profile: focused ? '👤' : '👥',
    Admin: focused ? '⚙️' : '🔧',
  };
  return icons[name as keyof typeof icons] || '❓';
};

const Tab = createBottomTabNavigator();
const Stack = createStackNavigator();

function TabNavigator() {
  const { user } = useAuth();

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused }) => (
          <View style={{ alignItems: 'center', justifyContent: 'center' }}>
            <TabIcon name={route.name} focused={focused} />
          </View>
        ),
        tabBarActiveTintColor: '#DC2626',
        tabBarInactiveTintColor: '#718096',
        tabBarStyle: {
          backgroundColor: '#FFFFFF',
          borderTopColor: '#E2E8F0',
          paddingTop: 8,
          paddingBottom: 8,
          height: 70,
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '600',
          marginTop: 4,
        },
        headerStyle: {
          backgroundColor: '#FFFFFF',
          borderBottomColor: '#E2E8F0',
        },
        headerTitleStyle: {
          color: '#1A202C',
          fontSize: 18,
          fontWeight: 'bold',
        },
      })}
    >
      <Tab.Screen 
        name="Home" 
        component={HomeScreen}
        options={{
          title: 'Inicio',
          headerTitle: 'AFK Smash',
        }}
      />
      <Tab.Screen 
        name="Tournaments" 
        component={TournamentsScreen}
        options={{
          title: 'Torneos',
          headerTitle: 'Torneos Disponibles',
        }}
      />
      <Tab.Screen 
        name="Profile" 
        component={ProfileScreen}
        options={{
          title: 'Perfil',
          headerTitle: 'Mi Perfil',
        }}
      />
      {user?.isAdmin && (
        <Tab.Screen 
          name="Admin" 
          component={AdminScreen}
          options={{
            title: 'Admin',
            headerTitle: 'Panel Admin',
          }}
        />
      )}
    </Tab.Navigator>
  );
}

// Placeholder components
function ProfileScreen() {
  const { user, logout } = useAuth();
  
  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 }}>
      <View style={{ alignItems: 'center', marginBottom: 30 }}>
        <View style={{ 
          width: 80, 
          height: 80, 
          borderRadius: 40, 
          backgroundColor: '#DC2626',
          justifyContent: 'center',
          alignItems: 'center',
          marginBottom: 16
        }}>
          <Text style={{ color: '#FFFFFF', fontSize: 32, fontWeight: 'bold' }}>
            {user?.name?.charAt(0).toUpperCase() || '?'}
          </Text>
        </View>
        <Text style={{ fontSize: 24, fontWeight: 'bold', color: '#1A202C' }}>
          {user?.name}
        </Text>
        <Text style={{ fontSize: 16, color: '#718096' }}>
          @{user?.tag}
        </Text>
      </View>
      
      <TouchableOpacity
        onPress={logout}
        style={{
          backgroundColor: '#EF4444',
          paddingHorizontal: 24,
          paddingVertical: 12,
          borderRadius: 12,
        }}
      >
        <Text style={{ color: '#FFFFFF', fontSize: 16, fontWeight: 'bold' }}>
          Cerrar Sesión
        </Text>
      </TouchableOpacity>
    </View>
  );
}

function AdminScreen() {
  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
      <Text style={{ fontSize: 18, color: '#718096' }}>
        Panel de Administración
      </Text>
      <Text style={{ fontSize: 14, color: '#A0AEC0', marginTop: 8 }}>
        Próximamente...
      </Text>
    </View>
  );
}

function AppNavigator() {
  const { user, isLoading } = useAuth();

  useEffect(() => {
    if (user) {
      // Registrar para notificaciones push
      notificationService.registerForPushNotifications().then(token => {
        if (token) {
          notificationService.sendTokenToServer(token, user.id);
        }
      });
    }
  }, [user]);

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#DC2626' }}>
        <ActivityIndicator size="large" color="#FFFFFF" />
      </View>
    );
  }

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {user ? (
          <Stack.Screen name="MainTabs" component={TabNavigator} />
        ) : (
          <Stack.Screen name="Login" component={LoginScreen} />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppNavigator />
      <StatusBar style="light" backgroundColor="#DC2626" />
    </AuthProvider>
  );
}