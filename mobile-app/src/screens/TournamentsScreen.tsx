import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
  Alert,
} from 'react-native';
import { Tournament, Registration } from '../types';
import { tournamentService } from '../services/tournamentService';
import { useAuth } from '../context/AuthContext';

export default function TournamentsScreen() {
  const { user } = useAuth();
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [registrations, setRegistrations] = useState<Registration[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setIsLoading(true);
      const [tournamentsData, registrationsData] = await Promise.all([
        tournamentService.getTournaments('afk'),
        user ? tournamentService.getUserRegistrations(user.id) : [],
      ]);

      setTournaments(tournamentsData);
      setRegistrations(registrationsData);
    } catch (error) {
      console.error('Error loading tournaments:', error);
      Alert.alert('Error', 'No se pudieron cargar los torneos');
    } finally {
      setIsLoading(false);
    }
  };

  const onRefresh = async () => {
    setIsRefreshing(true);
    await loadData();
    setIsRefreshing(false);
  };

  const handleRegisterForTournament = async (tournament: Tournament) => {
    if (!user) return;

    try {
      // Verificar si ya está registrado
      const isRegistered = registrations.some(reg => reg.tournamentId === tournament.id);
      
      if (isRegistered) {
        // Desregistrarse
        Alert.alert(
          'Desregistrarse',
          `¿Estás seguro que quieres desregistrarte de ${tournament.name}?`,
          [
            { text: 'Cancelar', style: 'cancel' },
            {
              text: 'Desregistrarse',
              style: 'destructive',
              onPress: async () => {
                await tournamentService.unregisterFromTournament(tournament.id);
                await loadData();
              },
            },
          ]
        );
      } else {
        // Registrarse
        Alert.alert(
          'Registrarse',
          `¿Quieres registrarte en ${tournament.name}?`,
          [
            { text: 'Cancelar', style: 'cancel' },
            {
              text: 'Registrarse',
              onPress: async () => {
                try {
                  // Si hay múltiples juegos, mostrar selector
                  if (tournament.games.length > 1) {
                    // TODO: Implementar selector de juegos
                    await tournamentService.registerForTournament(tournament.id, tournament.games[0].id);
                  } else {
                    await tournamentService.registerForTournament(tournament.id);
                  }
                  await loadData();
                  Alert.alert('¡Éxito!', 'Te registraste correctamente al torneo');
                } catch (error: any) {
                  Alert.alert('Error', error.message || 'No se pudo completar el registro');
                }
              },
            },
          ]
        );
      }
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Ocurrió un error');
    }
  };

  const isRegistered = (tournamentId: string) => {
    return registrations.some(reg => reg.tournamentId === tournamentId);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('es-AR', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('es-AR', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const renderTournament = ({ item: tournament }: { item: Tournament }) => {
    const registered = isRegistered(tournament.id);
    const isFull = tournament.maxParticipants && tournament.currentParticipants >= tournament.maxParticipants;
    const canRegister = tournament.registrationOpen && !isFull;

    return (
      <TouchableOpacity
        style={[
          styles.tournamentCard,
          registered && styles.registeredCard,
        ]}
        onPress={() => handleRegisterForTournament(tournament)}
        disabled={!canRegister && !registered}
      >
        {/* Header */}
        <View style={styles.tournamentHeader}>
          <View style={styles.tournamentInfo}>
            <Text style={styles.tournamentName}>{tournament.name}</Text>
            <Text style={styles.tournamentCommunity}>
              🏠 {tournament.community.toUpperCase()}
            </Text>
          </View>
          <View style={styles.statusBadges}>
            {registered && (
              <View style={styles.registeredBadge}>
                <Text style={styles.registeredBadgeText}>INSCRITO</Text>
              </View>
            )}
            {canRegister ? (
              <View style={styles.openBadge}>
                <Text style={styles.openBadgeText}>ABIERTO</Text>
              </View>
            ) : (
              <View style={styles.closedBadge}>
                <Text style={styles.closedBadgeText}>
                  {isFull ? 'LLENO' : 'CERRADO'}
                </Text>
              </View>
            )}
          </View>
        </View>

        {/* Description */}
        {tournament.description && (
          <Text style={styles.description}>{tournament.description}</Text>
        )}

        {/* Details */}
        <View style={styles.detailsContainer}>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>📅 Fecha:</Text>
            <Text style={styles.detailValue}>{formatDate(tournament.startDate)}</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>⏰ Hora:</Text>
            <Text style={styles.detailValue}>{formatTime(tournament.startDate)}</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>🎮 Formato:</Text>
            <Text style={styles.detailValue}>{tournament.format}</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>👥 Participantes:</Text>
            <Text style={styles.detailValue}>
              {tournament.currentParticipants}
              {tournament.maxParticipants && `/${tournament.maxParticipants}`}
            </Text>
          </View>
        </View>

        {/* Games */}
        {tournament.games.length > 0 && (
          <View style={styles.gamesContainer}>
            <Text style={styles.gamesLabel}>Juegos:</Text>
            <View style={styles.gamesList}>
              {tournament.games.map((game) => (
                <View key={game.id} style={styles.gameChip}>
                  <Text style={styles.gameChipText}>{game.name}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Action Button */}
        <View style={styles.actionContainer}>
          {registered ? (
            <TouchableOpacity
              style={styles.unregisterButton}
              onPress={() => handleRegisterForTournament(tournament)}
            >
              <Text style={styles.unregisterButtonText}>Desregistrarse</Text>
            </TouchableOpacity>
          ) : canRegister ? (
            <TouchableOpacity
              style={styles.registerButton}
              onPress={() => handleRegisterForTournament(tournament)}
            >
              <Text style={styles.registerButtonText}>Registrarse</Text>
            </TouchableOpacity>
          ) : (
            <View style={styles.disabledButton}>
              <Text style={styles.disabledButtonText}>
                {isFull ? 'Torneo lleno' : 'Registro cerrado'}
              </Text>
            </View>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <FlatList
        data={tournaments}
        keyExtractor={(item) => item.id}
        renderItem={renderTournament}
        refreshControl={
          <RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} />
        }
        contentContainerStyle={styles.listContainer}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  listContainer: {
    padding: 16,
  },
  tournamentCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  registeredCard: {
    borderColor: '#10B981',
    borderWidth: 2,
  },
  tournamentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  tournamentInfo: {
    flex: 1,
  },
  tournamentName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1A202C',
    marginBottom: 4,
  },
  tournamentCommunity: {
    fontSize: 14,
    color: '#718096',
    fontWeight: '600',
  },
  statusBadges: {
    alignItems: 'flex-end',
  },
  registeredBadge: {
    backgroundColor: '#10B981',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    marginBottom: 4,
  },
  registeredBadgeText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: 'bold',
  },
  openBadge: {
    backgroundColor: '#3B82F6',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  openBadgeText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: 'bold',
  },
  closedBadge: {
    backgroundColor: '#EF4444',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  closedBadgeText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: 'bold',
  },
  description: {
    fontSize: 14,
    color: '#4A5568',
    lineHeight: 20,
    marginBottom: 16,
  },
  detailsContainer: {
    marginBottom: 16,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  detailLabel: {
    fontSize: 14,
    color: '#718096',
    fontWeight: '600',
  },
  detailValue: {
    fontSize: 14,
    color: '#2D3748',
    fontWeight: '500',
  },
  gamesContainer: {
    marginBottom: 20,
  },
  gamesLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#718096',
    marginBottom: 8,
  },
  gamesList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  gameChip: {
    backgroundColor: '#EDF2F7',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginRight: 8,
    marginBottom: 4,
  },
  gameChipText: {
    fontSize: 12,
    color: '#4A5568',
    fontWeight: '500',
  },
  actionContainer: {
    alignItems: 'center',
  },
  registerButton: {
    backgroundColor: '#DC2626',
    paddingHorizontal: 32,
    paddingVertical: 12,
    borderRadius: 12,
    minWidth: 140,
  },
  registerButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  unregisterButton: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 32,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#EF4444',
    minWidth: 140,
  },
  unregisterButtonText: {
    color: '#EF4444',
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  disabledButton: {
    backgroundColor: '#E2E8F0',
    paddingHorizontal: 32,
    paddingVertical: 12,
    borderRadius: 12,
    minWidth: 140,
  },
  disabledButtonText: {
    color: '#A0AEC0',
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
  },
});