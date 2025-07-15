import { useEffect, useState } from 'react';
import { getDeWebData } from '../lib/massa-web3';

interface TradeEvent {
  timestamp: number;
  type: string;
  data: string[];
}

export default function StrategyDashboard({ strategyId }: { strategyId: string }) {
  const [events, setEvents] = useState<TradeEvent[]>([]);
  const [roi, setRoi] = useState<number>(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch trade history
        const logs = await getDeWebData(`dcaEvent_${strategyId}`);
        setEvents(logs.map((log: any) => ({
          timestamp: log.timestamp,
          type: log.data.split('|')[0],
          data: log.data.split('|').slice(1)
        })));
        
        // Calculate ROI (mock implementation)
        const totalInvested = logs
          .filter((e: any) => e.data.startsWith('Executed'))
          .reduce((sum: number, e: any) => sum + parseInt(e.data.split('|')[1]) / 1e8, 0);
        
        const currentValue = totalInvested * 1.23; // 23% ROI
        setRoi(((currentValue - totalInvested) / totalInvested) * 100);
        
      } catch (error) {
        console.error('Error loading strategy data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
    
    // Refresh every 30 seconds
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, [strategyId]);

  if (loading) return <div>Loading dashboard...</div>;

  return (
    <div className="dashboard">
      <div className="roi-calculator">
        <h3>Performance Summary</h3>
        <p>Your ${events.filter(e => e.type === 'Executed').length * 10} DCA → 
           <span className={roi >= 0 ? 'profit' : 'loss'}> {roi.toFixed(2)}%</span> vs spot</p>
      </div>
      
      <div className="timeline">
        <h3>Trade History</h3>
        {events.length > 0 ? (
          <ul>
            {events.map((event, index) => (
              <li key={index} className="timeline-event">
                <div className="event-time">
                  {new Date(event.timestamp).toLocaleString()}
                </div>
                <div className="event-details">
                  {event.type === 'Created' ? (
                    <span>Strategy created: {event.data[0]} → {event.data[1]}</span>
                  ) : event.type === 'Executed' ? (
                    <span>Executed: {parseInt(event.data[0]) / 1e8} → {parseInt(event.data[1]) / 1e8}</span>
                  ) : (
                    <span>{event.type}</span>
                  )}
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p>No activity yet</p>
        )}
      </div>
    </div>
  );
}