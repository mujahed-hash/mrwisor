import { Request, Response } from 'express';
import db from '../models'; // Ensure this imports where Ad is registered
import { Op } from 'sequelize';

const Ad = db.Ad; // We need to update models/index.ts to export this

export const createAd = async (req: Request, res: Response) => {
    try {
        const ad = await Ad.create(req.body);
        res.status(201).json(ad);
    } catch (error) {
        console.error('Error creating ad:', error);
        res.status(500).json({ message: 'Error creating ad' });
    }
};

export const getAds = async (req: Request, res: Response) => {
    try {
        const { activeOnly, type, userCountry, userState, userCity } = req.query;
        const whereClause: any = {};

        if (activeOnly === 'true') {
            whereClause.isActive = true;
        }

        if (type) {
            whereClause.type = type;
        }

        const allAds = await Ad.findAll({ where: whereClause, order: [['createdAt', 'DESC']] });

        // If user location is provided, filter ads by location targeting
        if (userCountry || userState || userCity) {
            const filteredAds = allAds.filter((ad: any) => {
                const targetLocations = ad.targetLocations;

                // If no targeting, show to everyone
                if (!targetLocations || targetLocations.length === 0) {
                    return true;
                }

                // Check if user's location matches any target
                return targetLocations.some((target: any) => {
                    // If target has country, user must match
                    if (target.country && target.country !== userCountry) {
                        return false;
                    }
                    // If target has state, user must match
                    if (target.state && target.state !== userState) {
                        return false;
                    }
                    // If target has city, user must match  
                    if (target.city && target.city !== userCity) {
                        return false;
                    }
                    // All specified fields match
                    return true;
                });
            });

            res.status(200).json(filteredAds);
        } else {
            // No user location, return all ads (admin view or users without location)
            res.status(200).json(allAds);
        }
    } catch (error) {
        console.error('Error fetching ads:', error);
        res.status(500).json({ message: 'Error fetching ads' });
    }
};

export const updateAd = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const [updated] = await Ad.update(req.body, { where: { id } });
        if (updated) {
            const updatedAd = await Ad.findByPk(id);
            res.status(200).json(updatedAd);
        } else {
            res.status(404).json({ message: 'Ad not found' });
        }
    } catch (error) {
        console.error('Error updating ad:', error);
        res.status(500).json({ message: 'Error updating ad' });
    }
};

export const deleteAd = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const deleted = await Ad.destroy({ where: { id } });
        if (deleted) {
            res.status(204).send();
        } else {
            res.status(404).json({ message: 'Ad not found' });
        }
    } catch (error) {
        console.error('Error deleting ad:', error);
        res.status(500).json({ message: 'Error deleting ad' });
    }
};
