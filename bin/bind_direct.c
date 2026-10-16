#define _GNU_SOURCE
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <unistd.h>
#include <sys/socket.h>
#include <netinet/in.h>
#include <net/if.h>
#include <arpa/inet.h>
#include <ifaddrs.h>

#ifndef IP_BOUND_IF
#define IP_BOUND_IF 25
#endif

#ifndef IPV6_BOUND_IF
#define IPV6_BOUND_IF 125
#endif

static int g_target_if_idx = -1;

static int get_physical_interface_index(void) {
    if (g_target_if_idx > 0) {
        return g_target_if_idx;
    }

    const char *env_if = getenv("PHYSICAL_INTERFACE");
    if (env_if && env_if[0]) {
        g_target_if_idx = if_nametoindex(env_if);
        if (g_target_if_idx > 0) return g_target_if_idx;
    }

    // Auto-detect default physical interface (starts with "en", not "utun" / "lo")
    struct ifaddrs *ifaddr, *ifa;
    if (getifaddrs(&ifaddr) == 0) {
        for (ifa = ifaddr; ifa != NULL; ifa = ifa->ifa_next) {
            if (!ifa->ifa_name || !ifa->ifa_addr) continue;
            if (strncmp(ifa->ifa_name, "en", 2) == 0 && ifa->ifa_addr->sa_family == AF_INET) {
                struct sockaddr_in *sin = (struct sockaddr_in *)ifa->ifa_addr;
                uint32_t ip = ntohl(sin->sin_addr.s_addr);
                if ((ip >> 24) != 127 && (ip >> 24) != 0) {
                    g_target_if_idx = if_nametoindex(ifa->ifa_name);
                    break;
                }
            }
        }
        freeifaddrs(ifaddr);
    }

    if (g_target_if_idx <= 0) {
        g_target_if_idx = if_nametoindex("en0");
    }

    return g_target_if_idx;
}

static inline int is_loopback(const struct sockaddr *addr) {
    if (!addr) return 1;
    if (addr->sa_family == AF_INET) {
        const struct sockaddr_in *in = (const struct sockaddr_in *)addr;
        uint32_t ip = ntohl(in->sin_addr.s_addr);
        // Exclude loopback (127.0.0.0/8) and INADDR_ANY (0.0.0.0)
        if (ip == 0 || (ip >> 24) == 127) return 1;
    } else if (addr->sa_family == AF_INET6) {
        const struct sockaddr_in6 *in6 = (const struct sockaddr_in6 *)addr;
        if (IN6_IS_ADDR_LOOPBACK(&in6->sin6_addr) || IN6_IS_ADDR_UNSPECIFIED(&in6->sin6_addr)) return 1;
    }
    // All non-local addresses (BitTorrent peers, trackers, DHT, uTP) MUST be bound to en0
    return 0;
}

static void bind_socket_to_physical(int sockfd, const struct sockaddr *addr) {
    if (!addr) return;
    if (is_loopback(addr)) {
        return; // Preserve local loopback for TorrServer web UI and FastAPI
    }

    int if_idx = get_physical_interface_index();
    if (if_idx <= 0) return;

    if (addr->sa_family == AF_INET) {
        setsockopt(sockfd, IPPROTO_IP, IP_BOUND_IF, &if_idx, sizeof(if_idx));
    } else if (addr->sa_family == AF_INET6) {
        setsockopt(sockfd, IPPROTO_IPV6, IPV6_BOUND_IF, &if_idx, sizeof(if_idx));
    }
}

// Interposed bind (for torrent listening sockets and outbound binds)
int my_bind(int sockfd, const struct sockaddr *addr, socklen_t addrlen) {
    if (addr && !is_loopback(addr)) {
        bind_socket_to_physical(sockfd, addr);
    }
    return bind(sockfd, addr, addrlen);
}

// Interposed connect (for outgoing TCP BitTorrent peers and trackers)
int my_connect(int sockfd, const struct sockaddr *addr, socklen_t addrlen) {
    if (addr && !is_loopback(addr)) {
        bind_socket_to_physical(sockfd, addr);
    }
    return connect(sockfd, addr, addrlen);
}

// Interposed sendto (for UDP DHT and uTP torrent traffic)
ssize_t my_sendto(int sockfd, const void *buf, size_t len, int flags, const struct sockaddr *dest_addr, socklen_t addrlen) {
    if (dest_addr && !is_loopback(dest_addr)) {
        bind_socket_to_physical(sockfd, dest_addr);
    }
    return sendto(sockfd, buf, len, flags, dest_addr, addrlen);
}

// Interposed sendmsg (for Go net.PacketConn and UDP batching)
ssize_t my_sendmsg(int sockfd, const struct msghdr *msg, int flags) {
    if (msg && msg->msg_name && !is_loopback((const struct sockaddr *)msg->msg_name)) {
        bind_socket_to_physical(sockfd, (const struct sockaddr *)msg->msg_name);
    }
    return sendmsg(sockfd, msg, flags);
}

// Apple Dynamic Library Interposition table
typedef struct interpose_s {
    const void *replacement;
    const void *target;
} interpose_t;

__attribute__((used)) static const interpose_t interposers[]
    __attribute__((section("__DATA, __interpose"))) = {
        { (const void *)my_bind,    (const void *)bind },
        { (const void *)my_connect, (const void *)connect },
        { (const void *)my_sendto,  (const void *)sendto },
        { (const void *)my_sendmsg, (const void *)sendmsg },
};
