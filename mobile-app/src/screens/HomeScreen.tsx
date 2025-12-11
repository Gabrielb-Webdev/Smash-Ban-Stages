import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  StyleSheet,
  Alert,
} from 'react-native';
import { useAuth } from '../context/AuthContext';
import { Tournament, Match } from '../types';
import { tournamentService } from '../services/tournamentService';

export default function HomeScreen() {
  const { user } = useAuth();
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [upcomingMatches, setUpcomingMatches] = useState<Match[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setIsLoading(true);
      const [tournamentsData, matchesData] = await Promise.all([
        tournamentService.getTournaments('afk'),
        user ? tournamentService.getUserMatches(user.id) : [],
      ]);

      setTournaments(tournamentsData);
      setUpcomingMatches(matchesData.filter(match => match.status !== 'completed'));
    } catch (error) {
      console.error('Error loading data:', error);
      Alert.alert('Error', 'No se pudieron cargar los datos');
    } finally {
      setIsLoading(false);
    }
  };

  const onRefresh = async () => {
    setIsRefreshing(true);
    await loadData();
    setIsRefreshing(false);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('es-AR', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} />
      }
    >
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.welcomeText}>¡Hola, {user?.name}!</Text>
          <Text style={styles.subtitleText}>Comunidad AFK Buenos Aires</Text>
        </View>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>
            {user?.name?.charAt(0).toUpperCase() || '?'}
          </Text>
        </View>
      </View>

      {/* Próximos Matches */}
      {upcomingMatches.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🎮 Próximos Matches</Text>
          {upcomingMatches.slice(0, 3).map((match) => (
            <TouchableOpacity key={match.id} style={styles.matchCard}>
              <View style={styles.matchHeader}>
                <Text style={styles.matchRound}>{match.round}</Text>
                {match.status === 'ready' && (
                  <View style={styles.readyBadge}>
                    <Text style={styles.readyBadgeText}>LISTO</Text>
                  </View>
                )}
              </View>
              <View style={styles.matchPlayers}>
                <Text style={styles.playerText}>
                  {match.player1.name} vs {match.player2.name}
                </Text>
              </View>
              {match.setup && (
                <Text style={styles.setupText}>Setup: {match.setup.name}</Text>
              )}
            </TouchableOpacity>
          ))}
        </View>
      )}

      {/* Torneos Disponibles */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>🏆 Torneos Disponibles</Text>
        {tournaments.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateText}>
              No hay torneos disponibles en este momento
            </Text>
          </View>
        ) : (
          tournaments.map((tournament) => (
            <TouchableOpacity key={tournament.id} style={styles.tournamentCard}>
              <View style={styles.tournamentHeader}>
                <View>
                  <Text style={styles.tournamentName}>{tournament.name}</Text>
                  <Text style={styles.tournamentDate}>
                    📅 {formatDate(tournament.startDate)}
                  </Text>
                </View>
                <View style={styles.tournamentMeta}>
                  <Text style={styles.participantsText}>
                    {tournament.currentParticipants}
                    {tournament.maxParticipants && `/${tournament.maxParticipants}`}
                  </Text>
                  <Text style={styles.participantsLabel}>participantes</Text>
                </View>
              </View>
              
              {tournament.description && (
                <Text style={styles.tournamentDescription}>
                  {tournament.description}
                </Text>
              )}

              <View style={styles.tournamentFooter}>
                <Text style={styles.formatText}>Format: {tournament.format}</Text>
                {tournament.registrationOpen ? (
                  <View style={styles.openBadge}>
                    <Text style={styles.openBadgeText}>ABIERTO</Text>
                  </View>
                ) : (
                  <View style={styles.closedBadge}>
                    <Text style={styles.closedBadgeText}>CERRADO</Text>
                  </View>
                )}
              </View>
            </TouchableOpacity>
          ))
        )}
      </View>

      {/* Quick Actions */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>⚡ Acciones Rápidas</Text>
        <View style={styles.quickActions}>
          <TouchableOpacity style={styles.actionButton}>
            <Text style={styles.actionIcon}>🎯</Text>
            <Text style={styles.actionText}>Ver Brackets</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionButton}>
            <Text style={styles.actionIcon}>📊</Text>
            <Text style={styles.actionText}>Mis Stats</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionButton}>
            <Text style={styles.actionIcon}>⚙️</Text>
            <Text style={styles.actionText}>Configuración</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.bottomSpacer} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  welcomeText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1A202C',
  },
  subtitleText: {
    fontSize: 14,
    color: '#718096',
    marginTop: 2,
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#DC2626',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: 'bold',
  },
  section: {
    padding: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2D3748',
    marginBottom: 16,
  },
  matchCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  matchHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  matchRound: {
    fontSize: 12,
    color: '#718096',
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  readyBadge: {
    backgroundColor: '#10B981',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  readyBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: 'bold',
  },
  matchPlayers: {
    marginBottom: 8,
  },
  playerText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2D3748',
  },
  setupText: {
    fontSize: 14,
    color: '#718096',
  },
  tournamentCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  tournamentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  tournamentName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2D3748',
    marginBottom: 4,
  },
  tournamentDate: {
    fontSize: 14,
    color: '#718096',
  },
  tournamentMeta: {
    alignItems: 'flex-end',
  },
  participantsText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#DC2626',
  },
  participantsLabel: {
    fontSize: 12,
    color: '#718096',
  },
  tournamentDescription: {
    fontSize: 14,
    color: '#4A5568',
    marginBottom: 12,
    lineHeight: 20,
  },
  tournamentFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  formatText: {
    fontSize: 12,
    color: '#718096',
  },
  openBadge: {
    backgroundColor: '#10B981',
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
  emptyState: {
    alignItems: 'center',
    padding: 40,
  },
  emptyStateText: {
    fontSize: 16,
    color: '#718096',
    textAlign: 'center',
  },
  quickActions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  actionButton: {
    alignItems: 'center',
    padding: 16,
  },
  actionIcon: {
    fontSize: 24,
    marginBottom: 8,
  },
  actionText: {
    fontSize: 12,
    color: '#4A5568',
    fontWeight: '500',
  },
  bottomSpacer: {
    height: 20,
  },
});