# La Penúltima

## Overview

La Penúltima es una plataforma privada de pronósticos para el Mundial FIFA 2026.

Los participantes realizan predicciones de resultados de partidos y compiten en una clasificación general basada en puntos.

La plataforma está diseñada para una comunidad cerrada mediante invitación.

La aplicación NO procesa apuestas ni pagos.

---

## Product Vision

Crear la mejor experiencia posible para seguir el Mundial 2026 entre amigos mediante una plataforma simple, rápida y mobile-first.

---

## Product Principles

### Mobile First

Todas las funcionalidades deben diseñarse primero para móvil.

### Calendar First

La navegación principal está basada en fechas.

Los usuarios piensan en partidos por día, no por grupos.

### Simplicity

La experiencia principal debe requerir el menor número posible de clics.

### Private Community

La plataforma funciona únicamente mediante invitaciones.

---

## Architecture

### User Roles

#### Administrator

Responsibilities:

- Manage users
- Manage invitations
- Manage matches
- Manage results
- Configure prizes
- View all predictions
- Recalculate scores
- Access audit history

#### User

Responsibilities:

- Submit predictions
- Edit predictions before kickoff
- View rankings
- View standings
- Manage profile
- Change password

---

### Core Modules

#### Authentication

- Login
- Logout
- Password recovery
- Password change
- Invitation registration

#### Predictions

- Create prediction
- Update prediction
- Lock prediction after kickoff

#### Rankings

- Global leaderboard
- Prize projection
- Position tracking

#### Administration

- User management
- Match management
- Invitation management
- Audit history

---

### Tournament Structure

Tournament:

FIFA World Cup 2026

Total Matches:

104

Stages:

- Group Stage
- Round of 32
- Round of 16
- Quarter Finals
- Semi Finals
- Third Place Match
- Final

---

## Business Rules

### Prediction Locking

Predictions may be modified until kickoff.

After kickoff:

- Predictions become read-only.

### Prediction Privacy

Before kickoff:

- Users cannot see predictions from other users.

After kickoff:

- Predictions may be visible.

### Exact Score Rule

Exact score does not stack with winner points.

Award only exact score points.

### Knockout Match Rule

Penalty shootouts do not count.

Only:

- Regulation time
- Extra time

are used for scoring.

Example:

Argentina 1-1 France
Penalties 4-2

Official scoring result:

1-1

### Prize Distribution

Current configuration:

- First Place = 70%
- Second Place = 30%

If multiple users tie for a prize position:

- Split the prize equally.

---

## Scoring System

### Group Stage

- Exact Score = 3 points
- Correct Winner = 1 point

### Round of 32

- Exact Score = 4 points
- Correct Winner = 2 points

### Round of 16

- Exact Score = 5 points
- Correct Winner = 3 points

### Quarter Finals

- Exact Score = 6 points
- Correct Winner = 4 points

### Semi Finals

- Exact Score = 7 points
- Correct Winner = 5 points

### Final

- Exact Score = 8 points
- Correct Winner = 6 points

---

## UX Decisions

### Dashboard

Calendar grouped by date.

Next available date expanded by default.

### Rankings

Current user should always be highlighted.

### Community

Disabled users must not count as active participants.

### Prize Display

Before scored matches exist:

Display "-"

instead of projected winnings.

---

## Technical Stack

- Next.js
- React
- TypeScript
- Tailwind
- Supabase

---

## Protected Decisions

Do not change without explicit approval:

- Calendar-first navigation
- Prediction privacy
- Knockout evaluation rule
- Scoring system
- Exact score rule
- Prize distribution logic