import { describe, expect, it } from 'vitest'
import { computeSlots, freeSegments, localDateOf, localDayBounds, localMidnightUtc, staffTodayFrom, type SlotInput } from '../src/modules/availability/service.ts'

// 2026-11-16 est un lundi. Heure locale de Paris = UTC+1 en hiver.
const DATE = '2026-11-16'
const HOURS = [{ opensAt: '08:00', closesAt: '12:00' }, { opensAt: '13:00', closesAt: '19:00' }]
const NOW = new Date('2026-11-15T00:00:00Z')
const local = (hhmm: string) => new Date(`${DATE}T${hhmm}:00+01:00`)
const iso = (hhmm: string) => local(hhmm).toISOString()
const base = (over: Partial<SlotInput> = {}): SlotInput => ({ date: DATE, durationMin: 60, now: NOW, hours: HOURS, staff: [{ staffId: 1, busy: [] }], ...over })
const starts = (input: SlotInput) => computeSlots(input).map((s) => s.startsAt)

describe('computeSlots', () => {
  it('respecte la pause de midi et le pas de 15 min', () => {
    const s = starts(base())
    expect(s[0]).toBe(iso('08:00'))
    expect(s[1]).toBe(iso('08:15'))
    expect(s).toContain(iso('11:00'))
    expect(s).not.toContain(iso('11:15'))
    expect(s).not.toContain(iso('12:30'))
    expect(s).toContain(iso('13:00'))
    expect(s.at(-1)).toBe(iso('18:00'))
    expect(s).toHaveLength(13 + 21)
  })

  it('ne renvoie rien en cas de fermeture exceptionnelle', () => {
    expect(computeSlots(base({ closed: true }))).toEqual([])
  })

  it('exclut le conge d un coiffeur', () => {
    const s = starts(base({ staff: [{ staffId: 1, busy: [{ start: local('09:00'), end: local('11:00') }] }] }))
    expect(s).toContain(iso('08:00'))
    expect(s).not.toContain(iso('08:15'))
    expect(s).not.toContain(iso('10:00'))
    expect(s).toContain(iso('11:00'))
  })

  it('exclut une reservation existante', () => {
    const s = starts(base({ durationMin: 30, staff: [{ staffId: 1, busy: [{ start: local('14:00'), end: local('15:00') }] }] }))
    expect(s).toContain(iso('13:30'))
    expect(s).not.toContain(iso('13:45'))
    expect(s).not.toContain(iso('14:30'))
    expect(s).toContain(iso('15:00'))
  })

  it('impose un delai minimum d une heure', () => {
    const s = starts(base({ now: new Date(`${DATE}T09:10:00+01:00`) }))
    expect(s[0]).toBe(iso('10:15'))
  })

  it('refuse les dates au dela de 60 jours', () => {
    expect(computeSlots(base({ now: new Date('2026-09-01T00:00:00Z') }))).toEqual([])
  })

  it('sans preference : union des coiffeurs disponibles', () => {
    const slots = computeSlots(base({
      staff: [
        { staffId: 1, busy: [{ start: local('08:00'), end: local('12:00') }] },
        { staffId: 2, busy: [{ start: local('13:00'), end: local('19:00') }] },
      ],
    }))
    expect(slots.find((s) => s.startsAt === iso('09:00'))?.staffIds).toEqual([2])
    expect(slots.find((s) => s.startsAt === iso('15:00'))?.staffIds).toEqual([1])
    expect(slots).toHaveLength(13 + 21)
  })

  it('liste tous les coiffeurs libres pour un meme creneau', () => {
    const slots = computeSlots(base({ staff: [{ staffId: 2, busy: [] }, { staffId: 1, busy: [] }] }))
    expect(slots[0]!.staffIds).toEqual([1, 2])
  })
})

describe('outils de fuseau et disponibilites du jour', () => {
  it('convertit en date locale', () => {
    expect(localDateOf(new Date('2026-11-16T23:30:00Z'))).toBe('2026-11-17')
  })
  it('calcule les plages libres', () => {
    const segs = freeSegments([{ start: local('08:00'), end: local('12:00') }], [{ start: local('09:00'), end: local('10:00') }], local('08:30'))
    expect(segs.map((g) => [g.start.toISOString(), g.end.toISOString()])).toEqual([[iso('08:30'), iso('09:00')], [iso('10:00'), iso('12:00')]])
  })
  it('staff-today : libre jusqu a, prochain creneau, complet', () => {
    const now = local('09:00')
    const res = staffTodayFrom({
      hours: HOURS,
      closed: false,
      staff: [
        { staffId: 1, name: 'A', photoUrl: null, busy: [{ start: local('10:00'), end: local('11:00') }] },
        { staffId: 2, name: 'B', photoUrl: null, busy: [{ start: local('08:00'), end: local('14:00') }] },
        { staffId: 3, name: 'C', photoUrl: null, busy: [{ start: local('08:00'), end: local('19:00') }] },
      ],
    }, DATE, now)
    expect(res[0]).toMatchObject({ freeUntil: iso('10:00'), nextFreeAt: null, fullToday: false })
    expect(res[1]).toMatchObject({ freeUntil: null, nextFreeAt: iso('14:00'), fullToday: false })
    expect(res[2]).toMatchObject({ freeUntil: null, nextFreeAt: null, fullToday: true })
  })
})

describe("fuseau Europe/Paris et changements d'heure", () => {
  it("place les creneaux a la bonne heure UTC l'hiver (UTC+1) et l'ete (UTC+2)", () => {
    const winter = computeSlots({ date: '2026-12-01', durationMin: 60, now: new Date('2026-11-30T00:00:00Z'), hours: [{ opensAt: '09:00', closesAt: '12:00' }], staff: [{ staffId: 1, busy: [] }] })
    expect(winter[0]!.startsAt).toBe('2026-12-01T08:00:00.000Z')
    const summer = computeSlots({ date: '2027-06-15', durationMin: 60, now: new Date('2027-06-14T00:00:00Z'), hours: [{ opensAt: '09:00', closesAt: '12:00' }], staff: [{ staffId: 1, busy: [] }] })
    expect(summer[0]!.startsAt).toBe('2027-06-15T07:00:00.000Z')
  })

  it("gere le jour du passage a l'heure d'ete (journee de 23 h)", () => {
    const day = '2027-03-28'
    expect(new Date(localMidnightUtc(day)).toISOString()).toBe('2027-03-27T23:00:00.000Z')
    const { start, end } = localDayBounds(day)
    expect((end.getTime() - start.getTime()) / 3_600_000).toBe(23)
    const slots = computeSlots({ date: day, durationMin: 60, now: new Date('2027-03-27T00:00:00Z'), hours: [{ opensAt: '09:00', closesAt: '11:00' }], staff: [{ staffId: 1, busy: [] }] })
    expect(slots[0]!.startsAt).toBe('2027-03-28T07:00:00.000Z')
    expect(slots.at(-1)!.startsAt).toBe('2027-03-28T08:00:00.000Z')
  })

  it("gere le jour du passage a l'heure d'hiver (journee de 25 h)", () => {
    const { start, end } = localDayBounds('2026-10-25')
    expect((end.getTime() - start.getTime()) / 3_600_000).toBe(25)
    expect(localDateOf(new Date('2026-10-25T22:30:00Z'))).toBe('2026-10-25')
    expect(localDateOf(new Date('2026-10-25T23:30:00Z'))).toBe('2026-10-26')
  })
})
