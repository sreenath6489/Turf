// Mock IPL Service for demonstration
// In a real app, this would fetch from a cricket API

const MOCK_IPL_MATCHES = [
    {
        id: 'ipl-1',
        teamA: 'CSK',
        teamB: 'RCB',
        scoreA: '185/4',
        scoreB: '142/2',
        overs: '15.4',
        status: 'LIVE',
        venue: 'M. Chinnaswamy Stadium'
    },
    {
        id: 'ipl-2',
        teamA: 'MI',
        teamB: 'GT',
        scoreA: '0/0',
        scoreB: '0/0',
        overs: '0.0',
        status: 'SCHEDULED',
        time: '7:30 PM',
        venue: 'Wankhede Stadium'
    }
];

export const fetchIPLMatches = async () => {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 500));
    return MOCK_IPL_MATCHES;
};
