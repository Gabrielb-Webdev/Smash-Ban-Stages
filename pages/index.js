import Link from 'next/link';
import { useState } from 'react';
import Image from 'next/image';
import Head from 'next/head';

export default function Home() {
  const communities = [
    {
      id: 'cordoba',
      name: 'Smash Córdoba',
      logo: '/images/SCC.webp',
      description: 'Panel de administración de Smash Córdoba',
      color: 'from-blue-900 via-blue-700 to-blue-800',
      borderColor: 'border-blue-500',
      hoverColor: 'hover:border-blue-300'
    },
    {
      id: 'afk',
      name: 'Smash AFK',
      logo: '/images/AFK.webp',
      description: 'Panel de administración de Smash AFK (Buenos Aires)',
      color: 'from-red-900 via-red-700 to-orange-800',
      borderColor: 'border-yellow-500',
      hoverColor: 'hover:border-yellow-300'
    },
    {
      id: 'mendoza',
      name: 'Smash Mendoza',
      emoji: '🟢',
      description: 'Panel de administración de Smash Mendoza',
      color: 'from-green-900 via-green-700 to-emerald-800',
      borderColor: 'border-green-500',
      hoverColor: 'hover:border-green-300'
    }
  ];

  return (
    <>
      <Head>
        <title>la App sin H - Gestión de Torneos de Smash</title>
        <meta name="description" content="Panel de administración para comunidades de Smash Bros" />
      </Head>
      
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900 flex items-center justify-center p-4">
      <div className="max-w-6xl w-full">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-5xl md:text-6xl font-bold text-white mb-4">
            🎮 la App sin H
          </h1>
          <p className="text-xl text-gray-300">
            Selecciona tu comunidad para acceder al panel de administración
          </p>
        </div>

        {/* Community Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {communities.map((community) => (
            <Link 
              key={community.id} 
              href={`/admin/${community.id}`}
              className="group"
            >
              <div className={`
                bg-gradient-to-br ${community.color} 
                rounded-2xl p-8 
                border-4 ${community.borderColor} 
                ${community.hoverColor}
                shadow-2xl 
                transform transition-all duration-300 
                hover:scale-105 hover:shadow-3xl
                cursor-pointer
                h-full
              `}>
                {/* Logo/Icon */}
                <div className="mb-6 text-center transform group-hover:scale-110 transition-transform duration-300">
                  {community.logo ? (
                    <div className="flex justify-center">
                      <Image 
                        src={community.logo} 
                        alt={community.name}
                        width={120}
                        height={120}
                        className="object-contain"
                      />
                    </div>
                  ) : (
                    <div className="text-7xl">
                      {community.emoji}
                    </div>
                  )}
                </div>

                {/* Community Name */}
                <h2 className="text-3xl font-bold text-white text-center mb-3">
                  {community.name}
                </h2>

                {/* Description */}
                <p className="text-gray-200 text-center mb-6">
                  {community.description}
                </p>

                {/* Button */}
                <div className="text-center">
                  <span className="inline-block bg-white bg-opacity-20 text-white px-6 py-3 rounded-lg font-semibold group-hover:bg-opacity-30 transition-all">
                    Acceder al Panel →
                  </span>
                </div>
              </div>
            </Link>
          ))}
        </div>

        {/* Footer Info */}
        <div className="text-center text-gray-400 text-sm mt-8">
          <p>Selecciona una comunidad para gestionar sesiones, jugadores y configuraciones</p>
        </div>
      </div>
    </div>
    </>
  );
}

// Cache invalidation forced rebuild - 2024-12-09T22:55:00
