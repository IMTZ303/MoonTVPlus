/* eslint-disable no-console, @typescript-eslint/no-explicit-any */



import { AdminConfig } from './admin.types';
import { DatabaseAdapter } from './d1-adapter';
import { Favorite, IStorage, PlayRecord, SkipConfig } from './types';
import { userInfoCache } from './user-cache';



/** SQLite persistence; RedisHashAdapter preserves the device-token API. */
export class D1Storage implements IStorage {
  private db: DatabaseAdapter;
  public adapter: RedisHashAdapter;

  constructor(adapter: DatabaseAdapter) {
    this.db = adapter;

    // 创建 Redis Hash 兼容适配器用于设备管理
    this.adapter = new RedisHashAdapter(adapter);
  }




  // ==================== 播放记录 ====================

  async getPlayRecord(
    userName: string,
    key: string
  ): Promise<PlayRecord | null> {
    try {
      const result = await this.db
        .prepare('SELECT * FROM play_records WHERE username = ? AND key = ?')
        .bind(userName, key)
        .first();

      if (!result) return null;
      return this.rowToPlayRecord(result);
    } catch (err) {
      console.error('D1Storage.getPlayRecord error:', err);
      throw err;
    }
  }

  async setPlayRecord(
    userName: string,
    key: string,
    record: PlayRecord
  ): Promise<void> {
    try {
      await this.db
        .prepare(
          `
          INSERT INTO play_records (
            username, key, title, source_name, cover, year,
            episode_index, total_episodes, play_time, total_time,
            save_time, search_title, new_episodes, is_anime
          )
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          ON CONFLICT(username, key) DO UPDATE SET
            title = excluded.title,
            source_name = excluded.source_name,
            cover = excluded.cover,
            year = excluded.year,
            episode_index = excluded.episode_index,
            total_episodes = excluded.total_episodes,
            play_time = excluded.play_time,
            total_time = excluded.total_time,
            save_time = excluded.save_time,
            search_title = excluded.search_title,
            new_episodes = excluded.new_episodes,
            is_anime = excluded.is_anime
        `
        )
        .bind(
          userName,
          key,
          record.title,
          record.source_name,
          record.cover || '',
          record.year || '',
          record.index,
          record.total_episodes,
          record.play_time,
          record.total_time,
          record.save_time,
          record.search_title || '',
          record.new_episodes || null,
          record.is_anime ? 1 : 0
        )
        .run();
    } catch (err) {
      console.error('D1Storage.setPlayRecord error:', err);
      throw err;
    }
  }

  async getAllPlayRecords(
    userName: string
  ): Promise<{ [key: string]: PlayRecord }> {
    try {
      const results = await this.db
        .prepare(
          'SELECT * FROM play_records WHERE username = ? ORDER BY save_time DESC'
        )
        .bind(userName)
        .all();

      const records: { [key: string]: PlayRecord } = {};
      if (results.results) {
        for (const row of results.results) {
          const record = this.rowToPlayRecord(row);
          records[row.key as string] = record;
        }
      }
      return records;
    } catch (err) {
      console.error('D1Storage.getAllPlayRecords error:', err);
      throw err;
    }
  }

  async deletePlayRecord(userName: string, key: string): Promise<void> {
    try {
      await this.db
        .prepare('DELETE FROM play_records WHERE username = ? AND key = ?')
        .bind(userName, key)
        .run();
    } catch (err) {
      console.error('D1Storage.deletePlayRecord error:', err);
      throw err;
    }
  }

  async deletePlayRecords(userName: string, keys: string[]): Promise<void> {
    const uniqueKeys = Array.from(new Set(keys)).filter(Boolean);
    if (uniqueKeys.length === 0) return;

    try {
      const placeholders = uniqueKeys.map(() => '?').join(',');
      await this.db
        .prepare(
          `DELETE FROM play_records WHERE username = ? AND key IN (${placeholders})`
        )
        .bind(userName, ...uniqueKeys)
        .run();
    } catch (err) {
      console.error('D1Storage.deletePlayRecords error:', err);
      throw err;
    }
  }

  async cleanupOldPlayRecords(userName: string): Promise<void> {
    try {
      const maxRecords = parseInt(
        process.env.MAX_PLAY_RECORDS_PER_USER || '100',
        10
      );
      const threshold = maxRecords + 10;

      // 检查记录数量
      const countResult = await this.db
        .prepare(
          'SELECT COUNT(*) as count FROM play_records WHERE username = ?'
        )
        .bind(userName)
        .first();

      const count = (countResult?.count as number) || 0;
      if (count <= threshold) return;

      // 删除超出限制的旧记录
      await this.db
        .prepare(
          `
          DELETE FROM play_records
          WHERE username = ?
          AND key NOT IN (
            SELECT key FROM play_records
            WHERE username = ?
            ORDER BY save_time DESC
            LIMIT ?
          )
        `
        )
        .bind(userName, userName, maxRecords)
        .run();

      console.log(
        `D1Storage: Cleaned up old play records for user ${userName}`
      );
    } catch (err) {
      console.error('D1Storage.cleanupOldPlayRecords error:', err);
      throw err;
    }
  }

  async migratePlayRecords(userName: string): Promise<void> {
    // D1 是新系统，不需要迁移
    // 只需标记为已迁移
    try {
      await this.db
        .prepare('UPDATE users SET playrecord_migrated = 1 WHERE username = ?')
        .bind(userName)
        .run();

      // 清除缓存
      userInfoCache?.delete(userName);
    } catch (err) {
      console.error('D1Storage.migratePlayRecords error:', err);
    }
  }

  // ==================== 收藏 ====================

  async getFavorite(userName: string, key: string): Promise<Favorite | null> {
    try {
      const result = await this.db
        .prepare('SELECT * FROM favorites WHERE username = ? AND key = ?')
        .bind(userName, key)
        .first();

      if (!result) return null;
      return this.rowToFavorite(result);
    } catch (err) {
      console.error('D1Storage.getFavorite error:', err);
      throw err;
    }
  }

  async setFavorite(
    userName: string,
    key: string,
    favorite: Favorite
  ): Promise<void> {
    try {
      await this.db
        .prepare(
          `
          INSERT INTO favorites (
            username, key, source_name, total_episodes, title,
            year, cover, save_time, search_title, origin,
            is_completed, vod_remarks
          )
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          ON CONFLICT(username, key) DO UPDATE SET
            source_name = excluded.source_name,
            total_episodes = excluded.total_episodes,
            title = excluded.title,
            year = excluded.year,
            cover = excluded.cover,
            save_time = excluded.save_time,
            search_title = excluded.search_title,
            origin = excluded.origin,
            is_completed = excluded.is_completed,
            vod_remarks = excluded.vod_remarks
        `
        )
        .bind(
          userName,
          key,
          favorite.source_name,
          favorite.total_episodes,
          favorite.title,
          favorite.year || '',
          favorite.cover || '',
          favorite.save_time,
          favorite.search_title || '',
          favorite.origin || null,
          favorite.is_completed ? 1 : 0,
          favorite.vod_remarks || null
        )
        .run();
    } catch (err) {
      console.error('D1Storage.setFavorite error:', err);
      throw err;
    }
  }

  async getAllFavorites(
    userName: string
  ): Promise<{ [key: string]: Favorite }> {
    try {
      const results = await this.db
        .prepare(
          'SELECT * FROM favorites WHERE username = ? ORDER BY save_time DESC'
        )
        .bind(userName)
        .all();

      const favorites: { [key: string]: Favorite } = {};
      if (results.results) {
        for (const row of results.results) {
          const favorite = this.rowToFavorite(row);
          favorites[row.key as string] = favorite;
        }
      }
      return favorites;
    } catch (err) {
      console.error('D1Storage.getAllFavorites error:', err);
      throw err;
    }
  }

  async deleteFavorite(userName: string, key: string): Promise<void> {
    try {
      await this.db
        .prepare('DELETE FROM favorites WHERE username = ? AND key = ?')
        .bind(userName, key)
        .run();
    } catch (err) {
      console.error('D1Storage.deleteFavorite error:', err);
      throw err;
    }
  }

  async migrateFavorites(userName: string): Promise<void> {
    // D1 是新系统，不需要迁移
    try {
      await this.db
        .prepare('UPDATE users SET favorite_migrated = 1 WHERE username = ?')
        .bind(userName)
        .run();

      // 清除缓存
      userInfoCache?.delete(userName);
    } catch (err) {
      console.error('D1Storage.migrateFavorites error:', err);
    }
  }

  // ==================== 音乐播放记录相关 ====================













  // ==================== 音乐歌单相关 ====================



















  // ==================== Music V2 历史记录相关 ====================











  // ==================== Music V2 歌单相关 ====================



















  // ==================== 辅助方法 ====================

  private rowToPlayRecord(row: any): PlayRecord {
    return {
      title: row.title,
      source_name: row.source_name,
      cover: row.cover || '',
      year: row.year || '',
      index: row.episode_index,
      total_episodes: row.total_episodes,
      play_time: row.play_time,
      total_time: row.total_time,
      save_time: row.save_time,
      search_title: row.search_title || '',
      new_episodes: row.new_episodes || undefined,
      is_anime: row.is_anime === 1 || row.is_anime === true,
    };
  }

  private rowToFavorite(row: any): Favorite {
    return {
      source_name: row.source_name,
      total_episodes: row.total_episodes,
      title: row.title,
      year: row.year || '',
      cover: row.cover || '',
      save_time: row.save_time,
      search_title: row.search_title || '',
      origin: row.origin as 'vod' | 'live' | undefined,
      is_completed: row.is_completed === 1,
      vod_remarks: row.vod_remarks || undefined,
    };
  }

  // ==================== 用户管理 ====================

  // SHA256 加密密码（与 Redis 保持一致）
  private async hashPassword(password: string): Promise<string> {
    const encoder = new TextEncoder();
    const data = encoder.encode(password);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
  }

  async verifyUser(userName: string, password: string): Promise<boolean> {
    try {
      // 检查是否是环境变量中的管理员
      if (
        userName === process.env.USERNAME &&
        password === process.env.PASSWORD
      ) {
        return true;
      }

      const user = await this.db
        .prepare(
          'SELECT password_hash FROM users WHERE username = ? AND banned = 0'
        )
        .bind(userName)
        .first();

      if (!user || !user.password_hash) return false;

      // 使用 SHA-256 验证密码（与 Redis 保持一致）
      const hashedPassword = await this.hashPassword(password);
      return user.password_hash === hashedPassword;
    } catch (err) {
      console.error('D1Storage.verifyUser error:', err);
      return false;
    }
  }

  async checkUserExist(userName: string): Promise<boolean> {
    try {
      // 检查环境变量
      if (userName === process.env.USERNAME) {
        return true;
      }

      const result = await this.db
        .prepare('SELECT 1 FROM users WHERE username = ? LIMIT 1')
        .bind(userName)
        .first();

      return result !== null;
    } catch (err) {
      console.error('D1Storage.checkUserExist error:', err);
      return false;
    }
  }

  async changePassword(userName: string, newPassword: string): Promise<void> {
    try {
      const passwordHash = await this.hashPassword(newPassword);

      await this.db
        .prepare('UPDATE users SET password_hash = ? WHERE username = ?')
        .bind(passwordHash, userName)
        .run();
    } catch (err) {
      console.error('D1Storage.changePassword error:', err);
      throw err;
    }
  }

  async deleteUser(userName: string): Promise<void> {
    try {
      // 由于设置了 ON DELETE CASCADE，删除用户会自动删除相关数据
      await this.db
        .prepare('DELETE FROM users WHERE username = ?')
        .bind(userName)
        .run();
    } catch (err) {
      console.error('D1Storage.deleteUser error:', err);
      throw err;
    }
  }

  async getAllUsers(): Promise<string[]> {
    try {
      const results = await this.db
        .prepare('SELECT username FROM users ORDER BY created_at DESC')
        .all();

      if (!results.results) return [];
      return results.results.map((row) => row.username as string);
    } catch (err) {
      console.error('D1Storage.getAllUsers error:', err);
      return [];
    }
  }

  async getUserInfoV2(userName: string): Promise<any> {
    try {
      // 先从缓存获取
      const cached = userInfoCache?.get(userName);
      if (cached) {
        return cached;
      }

      // 先尝试从数据库获取用户信息
      const user = await this.db
        .prepare('SELECT * FROM users WHERE username = ?')
        .bind(userName)
        .first();

      if (user) {
        const userInfo = {
          role: user.role as 'owner' | 'admin' | 'user',
          banned: user.banned === 1,
          tags: user.tags ? JSON.parse(user.tags as string) : undefined,

          enabledApis: user.enabled_apis
            ? JSON.parse(user.enabled_apis as string)
            : undefined,
          created_at: user.created_at as number,
          playrecord_migrated: user.playrecord_migrated === 1,
          favorite_migrated: user.favorite_migrated === 1,
          skip_migrated: user.skip_migrated === 1,
          last_movie_request_time: user.last_movie_request_time as
            | number
            | undefined,
          email: user.email as string | undefined,

        };

        // 如果是站长，强制将 role 设置为 owner
        if (userName === process.env.USERNAME) {
          userInfo.role = 'owner';
        }

        // 写入缓存
        userInfoCache?.set(userName, userInfo);

        return userInfo;
      }

      // 如果数据库中没有，检查是否是环境变量中的站长
      if (userName === process.env.USERNAME) {
        // 站长即使数据库没有数据，也返回默认信息
        const ownerInfo = {
          role: 'owner' as const,
          banned: false,
          created_at: Date.now(),
          playrecord_migrated: true,
          favorite_migrated: true,
          skip_migrated: true,
        };

        // 为站长创建数据库记录
        try {
          await this.db
            .prepare(
              `
              INSERT INTO users (
                username, password_hash, role, banned, created_at,
                playrecord_migrated, favorite_migrated, skip_migrated
              )
              VALUES (?, ?, ?, 0, ?, 1, 1, 1)
            `
            )
            .bind(
              userName,
              '', // 站长不需要密码哈希
              'owner',
              ownerInfo.created_at
            )
            .run();
          console.log(`Created database record for site owner: ${userName}`);
        } catch (insertErr) {
          console.error('Failed to create owner record:', insertErr);
          // 即使插入失败，仍然返回默认信息
        }

        // 缓存站长信息
        userInfoCache?.set(userName, ownerInfo);
        return ownerInfo;
      }

      return null;
    } catch (err) {
      console.error('D1Storage.getUserInfoV2 error:', err);
      return null;
    }
  }

  async createUserV2?(
    userName: string,
    password: string,
    role: 'owner' | 'admin' | 'user',
    tags?: string[],
    oidcSub?: string,
    enabledApis?: string[]
  ): Promise<void> {
    try {
      const passwordHash = await this.hashPassword(password);

      await this.db
        .prepare(
          `
          INSERT INTO users (
            username, password_hash, role, banned, tags, oidc_sub,
            enabled_apis, created_at, playrecord_migrated,
            favorite_migrated, skip_migrated
          )
          VALUES (?, ?, ?, 0, ?, ?, ?, ?, 1, 1, 1)
        `
        )
        .bind(
          userName,
          passwordHash,
          role,
          tags ? JSON.stringify(tags) : null,
          oidcSub || null,
          enabledApis ? JSON.stringify(enabledApis) : null,
          Date.now()
        )
        .run();

      // 清除缓存
      userInfoCache?.delete(userName);
    } catch (err) {
      console.error('D1Storage.createUserV2 error:', err);
      throw err;
    }
  }

  async getUserListV2(
    offset = 0,
    limit = 20,
    ownerUsername?: string,
    search?: string
  ): Promise<{
    users: Array<{
      username: string;
      role: 'owner' | 'admin' | 'user';
      banned: boolean;
      tags?: string[];

      enabledApis?: string[];
      created_at: number;
    }>;
    total: number;
  }> {
    try {
      const trimmedSearch = search?.trim() || '';
      const searchPattern = `%${trimmedSearch}%`;

      // 获取总数
      const countQuery = trimmedSearch
        ? this.db
            .prepare(
              'SELECT COUNT(*) as total FROM users WHERE username LIKE ?'
            )
            .bind(searchPattern)
        : this.db.prepare('SELECT COUNT(*) as total FROM users');
      const countResult = await countQuery.first();
      let total = (countResult?.total as number) || 0;

      // 检查站长是否在数据库中
      let ownerInfo = null;
      let ownerInDatabase = false;
      if (ownerUsername) {
        ownerInfo = await this.getUserInfoV2(ownerUsername);
        ownerInDatabase = !!ownerInfo && ownerInfo.created_at !== 0;

        // 如果站长不在数据库中且匹配搜索条件，总数+1
        if (
          !ownerInDatabase &&
          (!trimmedSearch || ownerUsername.includes(trimmedSearch))
        ) {
          total += 1;
        }
      }

      // 调整偏移量和限制
      let actualOffset = offset;
      let actualLimit = limit;

      if (
        ownerUsername &&
        !ownerInDatabase &&
        (!trimmedSearch || ownerUsername.includes(trimmedSearch))
      ) {
        if (offset === 0) {
          // 第一页：只获取 limit-1 个用户，为站长留出位置
          actualLimit = limit - 1;
        } else {
          // 其他页：偏移量需要减1，因为站长占据了第一页的一个位置
          actualOffset = offset - 1;
        }
      }

      // 获取用户列表（按创建时间降序）
      const listQuery = trimmedSearch
        ? this.db
            .prepare(
              `
              SELECT username, role, banned, tags, oidc_sub, enabled_apis, created_at
              FROM users
              WHERE username LIKE ?
              ORDER BY created_at DESC
              LIMIT ? OFFSET ?
            `
            )
            .bind(searchPattern, actualLimit, actualOffset)
        : this.db
            .prepare(
              `
              SELECT username, role, banned, tags, oidc_sub, enabled_apis, created_at
              FROM users
              ORDER BY created_at DESC
              LIMIT ? OFFSET ?
            `
            )
            .bind(actualLimit, actualOffset);
      const result = await listQuery.all();

      const users = [];

      // 如果有站长且在第一页，确保站长始终在第一位
      if (
        ownerUsername &&
        offset === 0 &&
        (!trimmedSearch || ownerUsername.includes(trimmedSearch))
      ) {
        users.push({
          username: ownerUsername,
          role: 'owner' as const,
          banned: ownerInfo?.banned || false,
          tags: ownerInfo?.tags,

          enabledApis: ownerInfo?.enabledApis,
          created_at: ownerInfo?.created_at || 0,
        });
      }

      // 添加其他用户
      if (result.results) {
        for (const user of result.results) {
          // 跳过站长（已经添加）
          if (ownerUsername && user.username === ownerUsername) {
            continue;
          }

          users.push({
            username: user.username as string,
            role: user.role as 'owner' | 'admin' | 'user',
            banned: user.banned === 1,
            tags: user.tags ? JSON.parse(user.tags as string) : undefined,

            enabledApis: user.enabled_apis
              ? JSON.parse(user.enabled_apis as string)
              : undefined,
            created_at: user.created_at as number,
          });
        }
      }

      return { users, total };
    } catch (err) {
      console.error('D1Storage.getUserListV2 error:', err);
      return { users: [], total: 0 };
    }
  }

  async verifyUserV2(userName: string, password: string): Promise<boolean> {
    try {
      const user = await this.db
        .prepare('SELECT password_hash FROM users WHERE username = ?')
        .bind(userName)
        .first();

      if (!user) return false;

      const hashedPassword = await this.hashPassword(password);
      return user.password_hash === hashedPassword;
    } catch (err) {
      console.error('D1Storage.verifyUserV2 error:', err);
      return false;
    }
  }

  async updateUserInfoV2(
    userName: string,
    updates: {
      role?: 'owner' | 'admin' | 'user';
      banned?: boolean;
      tags?: string[];

      enabledApis?: string[];
    }
  ): Promise<void> {
    try {
      const fields: string[] = [];
      const values: any[] = [];

      if (updates.role !== undefined) {
        fields.push('role = ?');
        values.push(updates.role);
      }
      if (updates.banned !== undefined) {
        fields.push('banned = ?');
        values.push(updates.banned ? 1 : 0);
      }
      if (updates.tags !== undefined) {
        fields.push('tags = ?');
        values.push(JSON.stringify(updates.tags));
      }

      if (updates.enabledApis !== undefined) {
        fields.push('enabled_apis = ?');
        values.push(JSON.stringify(updates.enabledApis));
      }

      if (fields.length === 0) return;

      values.push(userName);

      await this.db
        .prepare(`UPDATE users SET ${fields.join(', ')} WHERE username = ?`)
        .bind(...values)
        .run();

      // 清除缓存
      userInfoCache?.delete(userName);
    } catch (err) {
      console.error('D1Storage.updateUserInfoV2 error:', err);
      throw err;
    }
  }

  async changePasswordV2(userName: string, newPassword: string): Promise<void> {
    try {
      const passwordHash = await this.hashPassword(newPassword);

      await this.db
        .prepare('UPDATE users SET password_hash = ? WHERE username = ?')
        .bind(passwordHash, userName)
        .run();

      // 清除缓存
      userInfoCache?.delete(userName);
    } catch (err) {
      console.error('D1Storage.changePasswordV2 error:', err);
      throw err;
    }
  }

  async checkUserExistV2(userName: string): Promise<boolean> {
    try {
      const user = await this.db
        .prepare('SELECT 1 FROM users WHERE username = ?')
        .bind(userName)
        .first();

      return !!user;
    } catch (err) {
      console.error('D1Storage.checkUserExistV2 error:', err);
      return false;
    }
  }



  async deleteUserV2(userName: string): Promise<void> {
    try {
      // D1 的外键约束会自动级联删除相关数据
      await this.db
        .prepare('DELETE FROM users WHERE username = ?')
        .bind(userName)
        .run();

      // 清除缓存
      userInfoCache?.delete(userName);
    } catch (err) {
      console.error('D1Storage.deleteUserV2 error:', err);
      throw err;
    }
  }

  async getUsersByTag(tagName: string): Promise<string[]> {
    try {
      // SQLite 不支持 JSON 查询，需要使用 LIKE
      const result = await this.db
        .prepare(
          `
          SELECT username FROM users
          WHERE tags LIKE ?
        `
        )
        .bind(`%"${tagName}"%`)
        .all();

      if (!result.results) return [];

      return result.results.map((row: any) => row.username as string);
    } catch (err) {
      console.error('D1Storage.getUsersByTag error:', err);
      return [];
    }
  }

  // 获取用户密码哈希（用于数据导出）
  async getUserPasswordHash(userName: string): Promise<string | null> {
    try {
      const user = await this.db
        .prepare('SELECT password_hash FROM users WHERE username = ?')
        .bind(userName)
        .first();

      return user ? (user.password_hash as string) : null;
    } catch (err) {
      console.error('D1Storage.getUserPasswordHash error:', err);
      return null;
    }
  }

  // 直接设置用户密码哈希（用于数据导入，不进行二次哈希）
  async setUserPasswordHash(
    userName: string,
    passwordHash: string
  ): Promise<void> {
    try {
      await this.db
        .prepare('UPDATE users SET password_hash = ? WHERE username = ?')
        .bind(passwordHash, userName)
        .run();
    } catch (err) {
      console.error('D1Storage.setUserPasswordHash error:', err);
      throw err;
    }
  }

  // 直接创建用户（用于数据导入，密码已经是哈希值）
  async createUserWithHashedPassword(
    userName: string,
    passwordHash: string,
    role: 'owner' | 'admin' | 'user',
    createdAt: number,
    tags?: string[],
    oidcSub?: string,
    enabledApis?: string[],
    banned?: boolean
  ): Promise<void> {
    try {
      await this.db
        .prepare(
          `
          INSERT INTO users (
            username, password_hash, role, banned, tags, oidc_sub,
            enabled_apis, created_at, playrecord_migrated,
            favorite_migrated, skip_migrated
          )
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, 1, 1)
        `
        )
        .bind(
          userName,
          passwordHash,
          role,
          banned ? 1 : 0,
          tags ? JSON.stringify(tags) : null,
          oidcSub || null,
          enabledApis ? JSON.stringify(enabledApis) : null,
          createdAt
        )
        .run();
    } catch (err) {
      console.error('D1Storage.createUserWithHashedPassword error:', err);
      throw err;
    }
  }

  async getUserEmail?(userName: string): Promise<string | null> {
    try {
      const result = await this.db
        .prepare('SELECT email FROM users WHERE username = ?')
        .bind(userName)
        .first();

      return result?.email as string | null;
    } catch (err) {
      console.error('D1Storage.getUserEmail error:', err);
      return null;
    }
  }

  async setUserEmail?(userName: string, email: string): Promise<void> {
    try {
      await this.db
        .prepare('UPDATE users SET email = ? WHERE username = ?')
        .bind(email, userName)
        .run();

      // 清除缓存
      userInfoCache?.delete(userName);
    } catch (err) {
      console.error('D1Storage.setUserEmail error:', err);
      throw err;
    }
  }


















  // ==================== TVBox订阅token ====================

  async getTvboxSubscribeToken?(userName: string): Promise<string | null> {
    try {
      const result = await this.db
        .prepare('SELECT tvbox_subscribe_token FROM users WHERE username = ?')
        .bind(userName)
        .first();

      return result?.tvbox_subscribe_token || null;
    } catch (err) {
      console.error('D1Storage.getTvboxSubscribeToken error:', err);
      return null;
    }
  }

  async setTvboxSubscribeToken?(
    userName: string,
    token: string
  ): Promise<void> {
    try {
      await this.db
        .prepare(
          'UPDATE users SET tvbox_subscribe_token = ? WHERE username = ?'
        )
        .bind(token, userName)
        .run();

      // 清除缓存
      userInfoCache?.delete(userName);
    } catch (err) {
      console.error('D1Storage.setTvboxSubscribeToken error:', err);
      throw err;
    }
  }

  async getUsernameByTvboxToken?(token: string): Promise<string | null> {
    try {
      const result = await this.db
        .prepare('SELECT username FROM users WHERE tvbox_subscribe_token = ?')
        .bind(token)
        .first();

      return result?.username || null;
    } catch (err) {
      console.error('D1Storage.getUsernameByTvboxToken error:', err);
      return null;
    }
  }

  // ==================== 搜索历史 ====================

  async getSearchHistory(userName: string): Promise<string[]> {
    try {
      const results = await this.db
        .prepare(
          'SELECT keyword FROM search_history WHERE username = ? ORDER BY timestamp DESC LIMIT 20'
        )
        .bind(userName)
        .all();

      if (!results.results) return [];
      return results.results.map((row) => row.keyword as string);
    } catch (err) {
      console.error('D1Storage.getSearchHistory error:', err);
      return [];
    }
  }

  async addSearchHistory(userName: string, keyword: string): Promise<void> {
    try {
      const timestamp = Date.now();

      // 插入或更新时间戳
      await this.db
        .prepare(
          `
          INSERT INTO search_history (username, keyword, timestamp)
          VALUES (?, ?, ?)
          ON CONFLICT(username, keyword) DO UPDATE SET timestamp = excluded.timestamp
        `
        )
        .bind(userName, keyword, timestamp)
        .run();

      // 保持最多 20 条记录
      const countResult = await this.db
        .prepare(
          'SELECT COUNT(*) as count FROM search_history WHERE username = ?'
        )
        .bind(userName)
        .first();

      const count = (countResult?.count as number) || 0;
      if (count > 20) {
        await this.db
          .prepare(
            `
            DELETE FROM search_history
            WHERE username = ?
            AND id NOT IN (
              SELECT id FROM search_history
              WHERE username = ?
              ORDER BY timestamp DESC
              LIMIT 20
            )
          `
          )
          .bind(userName, userName)
          .run();
      }
    } catch (err) {
      console.error('D1Storage.addSearchHistory error:', err);
      throw err;
    }
  }

  async deleteSearchHistory(userName: string, keyword?: string): Promise<void> {
    try {
      if (keyword) {
        await this.db
          .prepare(
            'DELETE FROM search_history WHERE username = ? AND keyword = ?'
          )
          .bind(userName, keyword)
          .run();
      } else {
        await this.db
          .prepare('DELETE FROM search_history WHERE username = ?')
          .bind(userName)
          .run();
      }
    } catch (err) {
      console.error('D1Storage.deleteSearchHistory error:', err);
      throw err;
    }
  }

  // ==================== 漫画书架 ====================









  // ==================== 漫画阅读历史 ====================











  // ==================== 电子书书架 ====================









  // ==================== 电子书阅读历史 ====================











  // ==================== 跳过配置 ====================

  async getSkipConfig(
    userName: string,
    source: string,
    id: string
  ): Promise<SkipConfig | null> {
    try {
      const key = `${source}+${id}`;
      const result = await this.db
        .prepare('SELECT * FROM skip_configs WHERE username = ? AND key = ?')
        .bind(userName, key)
        .first();

      if (!result) return null;
      return {
        enable: result.enable === 1,
        intro_time: result.intro_time as number,
        outro_time: result.outro_time as number,
      };
    } catch (err) {
      console.error('D1Storage.getSkipConfig error:', err);
      return null;
    }
  }

  async setSkipConfig(
    userName: string,
    source: string,
    id: string,
    config: SkipConfig
  ): Promise<void> {
    try {
      const key = `${source}+${id}`;
      await this.db
        .prepare(
          `
          INSERT INTO skip_configs (username, key, enable, intro_time, outro_time)
          VALUES (?, ?, ?, ?, ?)
          ON CONFLICT(username, key) DO UPDATE SET
            enable = excluded.enable,
            intro_time = excluded.intro_time,
            outro_time = excluded.outro_time
        `
        )
        .bind(
          userName,
          key,
          config.enable ? 1 : 0,
          config.intro_time,
          config.outro_time
        )
        .run();
    } catch (err) {
      console.error('D1Storage.setSkipConfig error:', err);
      throw err;
    }
  }

  async deleteSkipConfig(
    userName: string,
    source: string,
    id: string
  ): Promise<void> {
    try {
      const key = `${source}+${id}`;
      await this.db
        .prepare('DELETE FROM skip_configs WHERE username = ? AND key = ?')
        .bind(userName, key)
        .run();
    } catch (err) {
      console.error('D1Storage.deleteSkipConfig error:', err);
      throw err;
    }
  }

  async getAllSkipConfigs(
    userName: string
  ): Promise<{ [key: string]: SkipConfig }> {
    try {
      const results = await this.db
        .prepare('SELECT * FROM skip_configs WHERE username = ?')
        .bind(userName)
        .all();

      const configs: { [key: string]: SkipConfig } = {};
      if (results.results) {
        for (const row of results.results) {
          configs[row.key as string] = {
            enable: row.enable === 1,
            intro_time: row.intro_time as number,
            outro_time: row.outro_time as number,
          };
        }
      }
      return configs;
    } catch (err) {
      console.error('D1Storage.getAllSkipConfigs error:', err);
      return {};
    }
  }

  async migrateSkipConfigs(userName: string): Promise<void> {
    try {
      await this.db
        .prepare('UPDATE users SET skip_migrated = 1 WHERE username = ?')
        .bind(userName)
        .run();

      // 清除缓存
      userInfoCache?.delete(userName);
    } catch (err) {
      console.error('D1Storage.migrateSkipConfigs error:', err);
    }
  }

  // ==================== 弹幕过滤配置 ====================







  // ==================== 通知 ====================













  // ==================== 求片请求 ====================



















  // ==================== 管理员配置和其他 ====================

  async getAdminConfig(): Promise<AdminConfig | null> {
    try {
      const result = await this.db
        .prepare('SELECT config FROM admin_config WHERE id = 1')
        .first();

      if (!result) return null;
      return JSON.parse(result.config as string);
    } catch (err) {
      console.error('D1Storage.getAdminConfig error:', err);
      return null;
    }
  }

  async setAdminConfig(config: AdminConfig): Promise<void> {
    try {
      await this.db
        .prepare(
          `
          INSERT INTO admin_config (id, config, updated_at)
          VALUES (1, ?, ?)
          ON CONFLICT(id) DO UPDATE SET config = excluded.config, updated_at = excluded.updated_at
        `
        )
        .bind(JSON.stringify(config), Date.now())
        .run();
    } catch (err) {
      console.error('D1Storage.setAdminConfig error:', err);
      throw err;
    }
  }

  // ---------- 本地设置云同步 ----------





  async clearAllData(): Promise<void> {
    try {
      // 清空所有表（保留结构）
      const tables = [
        'play_records',
        'favorites',
        'search_history',
        'manga_shelf',
        'manga_read_records',
        'book_shelf',
        'book_read_records',
        'skip_configs',
        'music_v2_history',
        'music_v2_playlists',
        'music_v2_playlist_items',
        'danmaku_filter_configs',
        'notifications',
        'movie_requests',
        'user_movie_requests',
        'favorite_check_times',
        'global_config',
      ];

      for (const table of tables) {
        try {
          await this.db.prepare(`DELETE FROM ${table}`).run();
        } catch (err) {
          const message = err instanceof Error ? err.message : String(err);
          if (
            message.includes('no such table') ||
            message.includes('does not exist')
          ) {
            console.warn('D1Storage.clearAllData warning:', table, message);
            continue;
          }
          throw err;
        }
      }
    } catch (err) {
      console.error('D1Storage.clearAllData error:', err);
      throw err;
    }
  }

  async getGlobalValue(key: string): Promise<string | null> {
    try {
      const result = await this.db
        .prepare('SELECT value FROM global_config WHERE key = ?')
        .bind(key)
        .first();

      return result ? (result.value as string) : null;
    } catch (err) {
      console.error('D1Storage.getGlobalValue error:', err);
      return null;
    }
  }

  async setGlobalValue(key: string, value: string): Promise<void> {
    try {
      await this.db
        .prepare(
          `
          INSERT INTO global_config (key, value, updated_at)
          VALUES (?, ?, ?)
          ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at
        `
        )
        .bind(key, value, Date.now())
        .run();
    } catch (err) {
      console.error('D1Storage.setGlobalValue error:', err);
      throw err;
    }
  }

  async deleteGlobalValue(key: string): Promise<void> {
    try {
      await this.db
        .prepare('DELETE FROM global_config WHERE key = ?')
        .bind(key)
        .run();
    } catch (err) {
      console.error('D1Storage.deleteGlobalValue error:', err);
      throw err;
    }
  }




















  async getLastFavoriteCheckTime(userName: string): Promise<number> {
    try {
      const result = await this.db
        .prepare(
          'SELECT last_check_time FROM favorite_check_times WHERE username = ?'
        )
        .bind(userName)
        .first();

      return (result?.last_check_time as number) || 0;
    } catch (err) {
      console.error('D1Storage.getLastFavoriteCheckTime error:', err);
      return 0;
    }
  }

  async setLastFavoriteCheckTime(
    userName: string,
    timestamp: number
  ): Promise<void> {
    try {
      await this.db
        .prepare(
          `
          INSERT INTO favorite_check_times (username, last_check_time)
          VALUES (?, ?)
          ON CONFLICT(username) DO UPDATE SET last_check_time = excluded.last_check_time
        `
        )
        .bind(userName, timestamp)
        .run();
    } catch (err) {
      console.error('D1Storage.setLastFavoriteCheckTime error:', err);
      throw err;
    }
  }


}


class RedisHashAdapter {
  constructor(private db: DatabaseAdapter) {}


  async hSet(hashKey: string, field: string, value: string): Promise<void> {
    const key = `${hashKey}:${field}`;
    await this.db
      .prepare(
        `
        INSERT INTO global_config (key, value, updated_at)
        VALUES (?, ?, ?)
        ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at
      `
      )
      .bind(key, value, Date.now())
      .run();
  }


  async hGet(hashKey: string, field: string): Promise<string | null> {
    const key = `${hashKey}:${field}`;
    const result = await this.db
      .prepare('SELECT value FROM global_config WHERE key = ?')
      .bind(key)
      .first();

    return result ? (result.value as string) : null;
  }


  async hGetAll(hashKey: string): Promise<Record<string, string>> {
    const prefix = `${hashKey}:`;
    const results = await this.db
      .prepare('SELECT key, value FROM global_config WHERE key LIKE ?')
      .bind(`${prefix}%`)
      .all();

    const hash: Record<string, string> = {};

    if (results && results.results) {
      for (const row of results.results) {
        const fullKey = row.key as string;
        const field = fullKey.substring(prefix.length);
        hash[field] = row.value as string;
      }
    }

    return hash;
  }


  async hDel(hashKey: string, field: string): Promise<void> {
    const key = `${hashKey}:${field}`;
    await this.db
      .prepare('DELETE FROM global_config WHERE key = ?')
      .bind(key)
      .run();
  }


  async del(hashKey: string): Promise<void> {
    const prefix = `${hashKey}:`;
    await this.db
      .prepare('DELETE FROM global_config WHERE key LIKE ?')
      .bind(`${prefix}%`)
      .run();
  }
}
