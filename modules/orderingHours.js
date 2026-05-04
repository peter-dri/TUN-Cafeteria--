// Ordering Hours Module - controls breakfast visibility and after-hours messaging
const OrderingHoursModule = (() => {
    const BREAKFAST_START_MINUTES = 7 * 60 + 30; // 7:30 AM
    const LUNCH_START_MINUTES = 12 * 60; // 12:00 noon
    const CLOSING_MINUTES = 18 * 60; // 6:00 PM
    let intervalId = null;

    function getCurrentMinutes(now = new Date()) {
        return now.getHours() * 60 + now.getMinutes();
    }

    function getCurrentState(now = new Date()) {
        const currentMinutes = getCurrentMinutes(now);

        return {
            breakfastOpen: currentMinutes >= BREAKFAST_START_MINUTES && currentMinutes < LUNCH_START_MINUTES,
            lunchOpen: currentMinutes >= LUNCH_START_MINUTES && currentMinutes < CLOSING_MINUTES,
            orderingOpen: currentMinutes < CLOSING_MINUTES,
            pastOrderingTime: currentMinutes >= CLOSING_MINUTES
        };
    }

    function setVisible(element, visible) {
        if (!element) return;
        element.classList.toggle('is-hidden', !visible);
    }

    function refresh() {
        const state = getCurrentState();
        const breakfastSection = document.getElementById('breakfastSection');
        const lunchSection = document.getElementById('lunchSection');
        const banner = document.getElementById('orderingStatusBanner');

        setVisible(breakfastSection, state.breakfastOpen);
        setVisible(lunchSection, state.lunchOpen);
        setVisible(banner, state.pastOrderingTime);

        return state;
    }

    function start() {
        stop();
        refresh();
        intervalId = setInterval(refresh, 30000);
    }

    function init() {
        start();
    }

    function stop() {
        if (intervalId) {
            clearInterval(intervalId);
            intervalId = null;
        }
    }

    return {
        refresh,
        init,
        start,
        stop,
        getCurrentState
    };
})();

window.OrderingHoursModule = OrderingHoursModule;
