/**
 * useTour — thin re-export of useTourContext for clean import paths.
 *
 * Usage:
 *   import { useTour } from '@/hooks/useTour';
 *   const { startTour, isCompleted } = useTour();
 */
export { useTourContext as useTour } from '@/components/tour/TourContext';
